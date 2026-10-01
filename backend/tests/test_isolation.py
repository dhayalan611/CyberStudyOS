"""Real cookie authentication and two-user API isolation on guarded PostgreSQL."""
from datetime import datetime, timedelta, timezone
import json
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from fastapi.encoders import jsonable_encoder
from fastapi.testclient import TestClient
import jwt
from pydantic import SecretStr
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.auth import COOKIE_NAME, password_hasher
from app.config import settings
from app.database import get_db
from app.main import app
from app.models import Course, Topic, User
from app.rate_limit import auth_rate_limiter
from app.services import ai
from app.services.ai_context import MAX_RECORDS_PER_SOURCE, load_context
from app.services.legacy_ownership import OWNED_MODELS
from test_database import integration_engine
from test_ownership import resource_values

PATHS = {model: '/api/' + {'ctf_challenges': 'ctf', 'study_sessions': 'study-sessions'}.get(
    model.__tablename__, model.__tablename__) for model in OWNED_MODELS}


class IsolationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = integration_engine()
        cls.addClassCleanup(cls.engine.dispose)
        cls.password = 'isolation test password'
        cls.password_hash = password_hasher.hash(cls.password)

    def setUp(self):
        auth_rate_limiter.reset()
        self.connection = self.engine.connect()
        self.addCleanup(self.connection.close)
        transaction = self.connection.begin()
        self.addCleanup(transaction.rollback)
        self.sessions = sessionmaker(bind=self.connection, join_transaction_mode='create_savepoint')
        def database():
            with self.sessions() as session:
                yield session
        app.dependency_overrides[get_db] = database
        self.addCleanup(app.dependency_overrides.pop, get_db)
        secure = patch.object(settings, 'AUTH_COOKIE_SECURE', False)
        secure.start()
        self.addCleanup(secure.stop)
        # Fail closed: any unexpected Gemini client construction fails the test.
        sdk = patch.object(ai.genai, 'Client')
        self.sdk = sdk.start()
        self.addCleanup(sdk.stop)
        self.sdk.side_effect = AssertionError('Unexpected Gemini call')
        self.a = self.enterContext(TestClient(app))
        self.b = self.enterContext(TestClient(app))
        self.anon = self.enterContext(TestClient(app))
        self.ids = {}
        for name, client in (('isolation_a', self.a), ('isolation_b', self.b)):
            with self.sessions.begin() as session:
                user = User(username=name, email=name + '@example.com', password_hash=self.password_hash)
                session.add(user)
                session.flush()
                self.ids[name] = user.id
            response = self.call(client, 'POST', '/api/auth/login', {'username': name, 'password': self.password})
            self.assertEqual(response.status_code, 200, response.text)

    def call(self, client, method, path, payload=None, headers=None):
        return client.request(method, path, json=jsonable_encoder(payload) if payload is not None else None,
                              headers={'Origin': settings.CORS_ORIGINS[0]} if headers is None else headers)

    def create(self, client, model):
        response = self.call(client, 'POST', PATHS[model], resource_values(model.__tablename__))
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def stored(self, model, resource_id):
        return dict(self.connection.execute(select(model.__table__).where(model.id == resource_id)).mappings().one())

    def test_every_resource_isolated_and_ownership_injection_rejected(self):
        for model in OWNED_MODELS:
            with self.subTest(resource=model.__tablename__):
                created = self.create(self.a, model)
                path = PATHS[model] + '/' + str(created['id'])
                before = self.stored(model, created['id'])
                self.assertEqual(before['user_id'], self.ids['isolation_a'])
                self.assertEqual(self.call(self.a, 'GET', path).json(), created)
                self.assertIn(created, self.call(self.a, 'GET', PATHS[model]).json())
                self.assertEqual(self.call(self.b, 'GET', PATHS[model]).json(), [])
                denied = self.call(self.b, 'GET', path)
                self.assertEqual(denied.status_code, 404)
                self.assertEqual(denied.json(), self.call(self.b, 'GET', PATHS[model] + '/-1').json())
                self.assertEqual(self.call(self.b, 'PATCH', path, {}).status_code, 405 if model is Course else 404)
                self.assertEqual(self.call(self.b, 'DELETE', path).status_code, 405)
                self.assertEqual(self.stored(model, created['id']), before)
                for owner in (self.ids['isolation_a'], self.ids['isolation_b'], None):
                    payload = {**resource_values(model.__tablename__), 'user_id': owner}
                    self.assertEqual(self.call(self.b, 'POST', PATHS[model], payload).status_code, 422)
                    if model is not Course:
                        self.assertEqual(self.call(self.a, 'PATCH', path, {'user_id': owner}).status_code, 422)
                self.assertEqual(self.stored(model, created['id']), before)
                own_b = self.create(self.b, model)
                self.assertEqual(self.stored(model, own_b['id'])['user_id'], self.ids['isolation_b'])
                self.assertEqual([r['id'] for r in self.call(self.a, 'GET', PATHS[model]).json()], [created['id']])
                self.assertEqual([r['id'] for r in self.call(self.b, 'GET', PATHS[model]).json()], [own_b['id']])
                b_path = PATHS[model] + '/' + str(own_b['id'])
                self.assertEqual(self.call(self.a, 'GET', b_path).status_code, 404)
                self.assertEqual(self.call(self.a, 'PATCH', b_path, {}).status_code, 405 if model is Course else 404)
                self.assertEqual(self.call(self.a, 'DELETE', b_path).status_code, 405)
                if model is not Course:
                    self.assertEqual(self.call(self.b, 'PATCH', PATHS[model] + '/' + str(own_b['id']), {}).status_code, 200)

    def test_null_legacy_resources_and_topics_are_invisible(self):
        for model in OWNED_MODELS:
            with self.sessions.begin() as session:
                legacy = model(**resource_values(model.__tablename__))
                session.add(legacy)
                session.flush()
                legacy_id = legacy.id
                if model is Course:
                    topic = Topic(course_id=legacy_id, title='Unowned topic')
                    session.add(topic)
                    session.flush()
                    course_id, topic_id = legacy_id, topic.id
            for client in (self.a, self.b):
                self.assertEqual(self.call(client, 'GET', PATHS[model]).json(), [])
                path = PATHS[model] + '/' + str(legacy_id)
                self.assertEqual(self.call(client, 'GET', path).status_code, 404)
                self.assertEqual(self.call(client, 'PATCH', path, {}).status_code, 405 if model is Course else 404)
                self.assertEqual(self.call(client, 'DELETE', path).status_code, 405)
            self.assertIsNone(self.stored(model, legacy_id)['user_id'])
        for client in (self.a, self.b):
            path = f'/api/courses/{course_id}/topics'
            self.assertEqual(self.call(client, 'GET', path).status_code, 404)
            self.assertEqual(self.call(client, 'POST', path, {'title': 'Not allowed'}).status_code, 404)
            self.assertEqual(self.call(client, 'PATCH', f'/api/topics/{topic_id}', {'completed': True}).status_code, 404)

    def test_topics_and_course_progress_are_isolated(self):
        a_course, b_course = self.create(self.a, Course), self.create(self.b, Course)
        path = f"/api/courses/{a_course['id']}/topics"
        topic = self.call(self.a, 'POST', path, {'title': 'Only A can complete this'}).json()
        topic_path = f"/api/topics/{topic['id']}"
        before = self.stored(Course, a_course['id'])
        self.assertEqual(self.call(self.b, 'GET', path).status_code, 404)
        self.assertEqual(self.call(self.b, 'POST', path, {'title': 'Intruder'}).status_code, 404)
        self.assertEqual(self.call(self.b, 'PATCH', topic_path, {'completed': True}).status_code, 404)
        # Single-topic GET and DELETE are not implemented; no data can be read/deleted.
        self.assertEqual(self.call(self.b, 'GET', topic_path).status_code, 405)
        self.assertEqual(self.call(self.b, 'DELETE', topic_path).status_code, 405)
        for payload in ({'title': 'Intruder', 'course_id': a_course['id']}, {'title': 'Intruder', 'user_id': self.ids['isolation_a']}):
            self.assertEqual(self.call(self.b, 'POST', f"/api/courses/{b_course['id']}/topics", payload).status_code, 422)
        self.assertEqual(self.call(self.a, 'PATCH', topic_path, {'completed': True, 'course_id': b_course['id']}).status_code, 422)
        self.assertEqual(self.stored(Course, a_course['id']), before)
        self.assertEqual(self.call(self.a, 'PATCH', topic_path, {'completed': True}).status_code, 200)
        self.assertEqual(self.stored(Course, a_course['id'])['progress'], 100)
        self.assertEqual(self.stored(Course, b_course['id'])['progress'], 0)
        self.assertTrue(self.call(self.a, 'GET', path).json()[0]['completed'])

    def test_all_implemented_private_routes_require_authentication(self):
        public = {'/', '/api/health', '/api/db-health'}
        routes = [(path, method) for path, operations in app.openapi()['paths'].items()
                  if path not in public and not path.startswith('/api/auth/')
                  for method in operations if method in {'get', 'post', 'put', 'patch', 'delete'}]
        now = datetime.now(timezone.utc)
        expired = jwt.encode({'sub': str(self.ids['isolation_a']), 'iat': now - timedelta(hours=1),
                              'exp': now - timedelta(seconds=1)}, settings.AUTH_SECRET.get_secret_value(), algorithm='HS256')
        for token in (None, 'invalid-token', expired):
            self.anon.cookies.clear()
            if token:
                self.anon.cookies.set(COOKIE_NAME, token)
            for path, method in routes:
                import re
                concrete = re.sub(r'\{[^}]+\}', '-1', path)
                with self.subTest(path=path, method=method, token=bool(token)):
                    self.assertEqual(self.call(self.anon, method.upper(), concrete, {} if method != 'get' else None).status_code, 401)
        self.sdk.assert_not_called()
        self.anon.cookies.clear()
        self.assertEqual(self.anon.get('/api/health').status_code, 200)
        self.assertEqual(self.anon.get('/api/auth/me').status_code, 401)

    def test_private_mutations_require_trusted_origin(self):
        resources = {model: self.create(self.a, model) for model in OWNED_MODELS}
        course_id = resources[Course]['id']
        topic_path = f'/api/courses/{course_id}/topics'
        topic = self.call(self.a, 'POST', topic_path, {'title': 'Origin test'}).json()
        cases = [('POST', PATHS[model], resource_values(model.__tablename__)) for model in OWNED_MODELS]
        cases += [('PATCH', PATHS[model] + '/' + str(resource['id']), {}) for model, resource in resources.items() if model is not Course]
        cases += [('POST', topic_path, {'title': 'Blocked'}), ('PATCH', f"/api/topics/{topic['id']}", {'completed': True}),
                  ('POST', '/api/ai/chat', {'message': 'Blocked'})]
        before = {model: self.stored(model, row['id']) for model, row in resources.items()}
        for headers in ({}, {'Origin': 'null'}, {'Origin': 'https://attacker.example'}):
            for method, path, payload in cases:
                with self.subTest(method=method, path=path, headers=headers):
                    self.assertEqual(self.call(self.a, method, path, payload, headers=headers).status_code, 403)
        for model, resource in resources.items():
            self.assertEqual(self.stored(model, resource['id']), before[model])
            self.assertEqual(len(self.call(self.a, 'GET', PATHS[model]).json()), 1)
        self.assertFalse(self.stored(Topic, topic['id'])['completed'])
        self.sdk.assert_not_called()

    def test_ai_context_and_gemini_payload_exclude_other_users_and_null_owners(self):
        markers = {}
        with self.sessions.begin() as session:
            for label, owner in (('PRIVATE_A', self.ids['isolation_a']), ('PRIVATE_B', self.ids['isolation_b']), ('LEGACY_NULL', None)):
                markers[label] = []
                for model in OWNED_MODELS:
                    values = resource_values(model.__tablename__)
                    marker = label + '_' + model.__tablename__
                    values['name' if model.__tablename__ == 'certifications' else 'title'] = marker
                    record = model(**values, user_id=owner)
                    session.add(record)
                    if model is Course:
                        session.flush()
                        session.add(Topic(course_id=record.id, title=label + '_topic_private_text'))
                    markers[label].append(marker)
        self.sdk.side_effect = None
        generate = self.sdk.return_value.__enter__.return_value.models.generate_content
        generate.return_value = SimpleNamespace(text='Scoped answer')
        with patch.object(settings, 'GEMINI_API_KEY', SecretStr('mock-only')):
            for label, client, other in (('PRIVATE_A', self.a, 'PRIVATE_B'), ('PRIVATE_B', self.b, 'PRIVATE_A')):
                with self.sessions() as session:
                    context = load_context(session, list(MAX_RECORDS_PER_SOURCE), user_id=self.ids['isolation_a' if label == 'PRIVATE_A' else 'isolation_b'])
                response = self.call(client, 'POST', '/api/ai/chat', {'message': 'Summarize my work', 'context_sources': list(MAX_RECORDS_PER_SOURCE)})
                self.assertEqual(response.status_code, 200, response.text)
                payload = str(generate.call_args.kwargs)
                for marker in markers[label][:6]:
                    self.assertIn(marker, json.dumps(context))
                    self.assertIn(marker, payload)
                for marker in markers[other] + markers['LEGACY_NULL']:
                    self.assertNotIn(marker, json.dumps(context))
                    self.assertNotIn(marker, payload)
                    self.assertNotIn(marker, response.text)
                # Unsupported task/session context is not silently added.
                for marker in markers[label][6:]:
                    self.assertNotIn(marker, payload)
                # Learning context includes course progress, never raw topic text.
                for topic_owner in markers:
                    self.assertNotIn(topic_owner + '_topic_private_text', payload)
            response = self.call(self.a, 'POST', '/api/ai/chat', {'message': 'No application context'})
            self.assertEqual(response.status_code, 200)
            self.assertTrue(generate.call_args.kwargs['contents'][-1].parts[1].text.endswith('{}'))

    def test_context_rejects_unsupported_sources_and_owner_or_profile_injection(self):
        for source in ('tasks', 'study_sessions', 'study-sessions', 'topics', 'profile'):
            with self.subTest(source=source):
                response = self.call(self.a, 'POST', '/api/ai/chat', {
                    'message': 'Read context', 'context_sources': [source],
                })
                self.assertEqual(response.status_code, 422)
        for extra in ({'user_id': self.ids['isolation_b']}, {'profile': {'name': 'Browser-local profile'}}):
            response = self.call(self.a, 'POST', '/api/ai/chat', {'message': 'Read context', **extra})
            self.assertEqual(response.status_code, 422)
        self.sdk.assert_not_called()

    def test_context_limits_apply_after_ownership_filtering(self):
        with self.sessions.begin() as session:
            for model, source in zip(OWNED_MODELS[:6], MAX_RECORDS_PER_SOURCE):
                for owner, count in ((self.ids['isolation_a'], 1), (self.ids['isolation_b'], MAX_RECORDS_PER_SOURCE[source] + 2), (None, 2)):
                    for index in range(count):
                        values = resource_values(model.__tablename__)
                        values['name' if model.__tablename__ == 'certifications' else 'title'] = f'{owner}_{source}_{index}'
                        session.add(model(**values, user_id=owner))
        with self.sessions() as session:
            context = load_context(session, list(MAX_RECORDS_PER_SOURCE), user_id=self.ids['isolation_a'])
        for source, data in context.items():
            self.assertEqual(len(data['records']), 1)
            self.assertFalse(data['has_more_records'])
            self.assertIn(f"{self.ids['isolation_a']}_{source}_0", json.dumps(data))

    def test_private_responses_are_not_cacheable(self):
        for model in OWNED_MODELS:
            created = self.create(self.a, model)
            path = PATHS[model] + '/' + str(created['id'])
            for client, endpoint, expected in ((self.a, PATHS[model], 200), (self.a, path, 200), (self.b, path, 404), (self.anon, path, 401)):
                response = self.call(client, 'GET', endpoint)
                self.assertEqual(response.status_code, expected)
                self.assertEqual(response.headers.get('Cache-Control'), 'no-store')

    def test_openapi_exposes_cookie_security_for_every_private_operation(self):
        schema = app.openapi()
        for path, operations in schema['paths'].items():
            if path in {'/', '/api/health', '/api/db-health'} or path.startswith('/api/auth/'):
                continue
            for method, operation in operations.items():
                if method in {'get', 'post', 'patch', 'put', 'delete'}:
                    self.assertIn({'APIKeyCookie': []}, operation['security'], path)
        for action in ('register', 'login', 'logout'):
            self.assertNotIn('security', schema['paths']['/api/auth/' + action]['post'])
