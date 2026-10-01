"""Ownership and local claim tests against guarded PostgreSQL; all changes roll back."""
from datetime import datetime, timedelta, timezone
from pathlib import Path
import runpy
import unittest
from unittest.mock import patch

from alembic.migration import MigrationContext
from alembic.operations import Operations
from sqlalchemy import MetaData, Table, event, inspect, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker

from app.models import Course, Topic, User
from app.services.legacy_ownership import ClaimError, OWNED_MODELS, claim_legacy_data
from test_database import integration_engine


def resource_values(table):
    now = datetime.now(timezone.utc)
    return {
        "courses": {"title": "Legacy course", "category": "Security", "total_topics": 1},
        "labs": {"title": "Legacy lab", "platform": "Local", "category": "Security", "difficulty": "Easy"},
        "notes": {"title": "Legacy note", "content": "Keep this content", "category": "Security"},
        "projects": {"title": "Legacy project", "category": "Security"},
        "certifications": {"name": "Legacy certificate", "issuer": "Local"},
        "ctf_challenges": {"title": "Legacy CTF", "platform": "Local", "category": "Security", "difficulty": "Easy"},
        "tasks": {"title": "Legacy task", "category": "Security"},
        "study_sessions": {"title": "Legacy session", "category": "Security", "start_time": now,
                           "end_time": now + timedelta(hours=1)},
    }[table]


class OwnershipTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = integration_engine()
        cls.addClassCleanup(cls.engine.dispose)

    def setUp(self):
        self.connection = self.engine.connect()
        self.addCleanup(self.connection.close)
        self.transaction = self.connection.begin()
        self.addCleanup(self.transaction.rollback)
        self.sessions = sessionmaker(bind=self.connection, join_transaction_mode="create_savepoint")
        self.output = []

    def seed(self):
        with self.sessions.begin() as session:
            target = User(username="ownership_target", email="ownership_target@example.com", password_hash="unused-test-hash")
            other = User(username="ownership_other", email="ownership_other@example.com", password_hash="unused-test-hash")
            session.add_all([target, other])
            session.flush()
            self.target_id, self.other_id = target.id, other.id
            self.legacy, self.owned = {}, {}
            for model in OWNED_MODELS:
                legacy = model(**resource_values(model.__tablename__))
                owned = model(**resource_values(model.__tablename__), user=other)
                session.add_all([legacy, owned])
                session.flush()
                self.legacy[model], self.owned[model] = legacy.id, owned.id
            topic = Topic(course_id=self.legacy[Course], title="Legacy topic")
            session.add(topic)
            session.flush()
            self.topic_id = topic.id

    def claim(self, **kwargs):
        return claim_legacy_data(self.sessions, "ownership_target", confirm=lambda _: True,
                                 output=self.output.append, **kwargs)

    def snapshot(self):
        return {model: self.connection.execute(select(model.__table__).order_by(model.id)).all()
                for model in (*OWNED_MODELS, Topic)}

    def test_columns_foreign_keys_and_indexes(self):
        inspector = inspect(self.connection)
        for model in OWNED_MODELS:
            table = model.__tablename__
            column = next(c for c in inspector.get_columns(table) if c["name"] == "user_id")
            self.assertTrue(column["nullable"])
            fk = next(f for f in inspector.get_foreign_keys(table) if f["constrained_columns"] == ["user_id"])
            self.assertEqual((fk["referred_table"], fk["referred_columns"]), ("users", ["id"]))
            self.assertEqual(fk["options"]["ondelete"], "RESTRICT")
            self.assertTrue(any(i["column_names"] == ["user_id"] for i in inspector.get_indexes(table)))
            with self.assertRaises(IntegrityError):
                with self.connection.begin_nested():
                    self.connection.execute(model.__table__.insert().values(**resource_values(table), user_id=-1))
        self.assertNotIn("user_id", {c["name"] for c in inspector.get_columns("topics")})

    def test_claim_only_null_owners_relationships_and_timestamps(self):
        self.seed()
        before = self.snapshot()
        counts = self.claim()
        self.assertEqual(set(counts), {m.__tablename__ for m in OWNED_MODELS})
        with self.sessions() as session:
            target = session.get(User, self.target_id)
            for model in OWNED_MODELS:
                self.assertGreaterEqual(counts[model.__tablename__], 1)
                resource = session.get(model, self.legacy[model])
                self.assertEqual(resource.user_id, target.id)
                self.assertIs(resource.user, target)
                self.assertIn(resource, getattr(target, model.__tablename__))
                self.assertEqual(session.get(model, self.owned[model]).user_id, self.other_id)
            self.assertEqual(session.get(Topic, self.topic_id).course.user.id, target.id)
        after = self.snapshot()
        for model in (*OWNED_MODELS, Topic):
            for old, new in zip(before[model], after[model]):
                self.assertEqual({k: v for k, v in old._mapping.items() if k != "user_id"},
                                 {k: v for k, v in new._mapping.items() if k != "user_id"})
        self.assertFalse(any(self.claim().values()))

    def test_preview_decline_and_missing_user_never_modify_records(self):
        self.seed()
        before = self.snapshot()
        self.claim(dry_run=True)
        self.assertEqual(self.snapshot(), before)
        def decline(username):
            self.assertEqual(username, "ownership_target")
            self.assertTrue(any("courses:" in line for line in self.output))
            return False
        self.assertIsNone(claim_legacy_data(self.sessions, "ownership_target", confirm=decline, output=self.output.append))
        with self.assertRaises(ClaimError):
            claim_legacy_data(self.sessions, "no_such_claim_user", confirm=lambda _: self.fail("Must not confirm"), output=self.output.append)
        self.assertEqual(self.snapshot(), before)

    def test_failure_after_first_update_rolls_back_every_table(self):
        self.seed()
        before = self.snapshot()
        def fail_on_labs(conn, cursor, statement, parameters, context, executemany):
            if statement.startswith("UPDATE labs "):
                raise RuntimeError("Injected failure")
        event.listen(self.connection, "before_cursor_execute", fail_on_labs)
        try:
            with self.assertRaisesRegex(RuntimeError, "Injected failure"):
                self.claim()
        finally:
            event.remove(self.connection, "before_cursor_execute", fail_on_labs)
        self.assertEqual(self.snapshot(), before)

    def test_changed_preview_aborts_instead_of_reassigning(self):
        self.seed()
        before = self.snapshot()
        def changed(username):
            self.connection.execute(update(Course).where(Course.id == self.legacy[Course]).values(user_id=self.other_id))
            return True
        with self.assertRaisesRegex(ClaimError, "changed since preview"):
            claim_legacy_data(self.sessions, "ownership_target", confirm=changed, output=self.output.append)
        self.assertEqual(self.snapshot(), before)

    def test_user_deletion_does_not_orphan_or_delete_resources(self):
        self.seed()
        before = self.snapshot()
        with self.assertRaises(IntegrityError):
            with self.sessions.begin() as session:
                user = session.get(User, self.other_id)
                for model in OWNED_MODELS:
                    self.assertTrue(getattr(user, model.__tablename__))
                session.delete(user)
        self.assertEqual(self.snapshot(), before)

    def test_records_inserted_after_preview_are_not_claimed(self):
        self.seed()
        inserted_id = None
        def confirm(username):
            nonlocal inserted_id
            inserted_id = self.connection.execute(
                Course.__table__.insert().values(**resource_values("courses")).returning(Course.id)
            ).scalar_one()
            return True
        claim_legacy_data(self.sessions, "ownership_target", confirm=confirm, output=self.output.append)
        with self.sessions() as session:
            self.assertIsNone(session.get(Course, inserted_id).user_id)
            self.assertEqual(session.get(Course, self.legacy[Course]).user_id, self.target_id)

    def test_migration_roundtrip_preserves_legacy_rows(self):
        # PostgreSQL transactional DDL: even a failed assertion restores the
        # complete original schema/data during teardown. No committed downgrade.
        path = Path(__file__).resolve().parents[1] / "alembic/versions/0010_add_user_ownership.py"
        migration = runpy.run_path(str(path))
        context = MigrationContext.configure(self.connection)
        with Operations.context(context):
            migration["downgrade"]()
            tables = {m: Table(m.__tablename__, MetaData(), autoload_with=self.connection) for m in OWNED_MODELS}
            for model, table in tables.items():
                self.connection.execute(table.insert().values(**resource_values(model.__tablename__)))
            before = {m: self.connection.execute(select(t).order_by(t.c.id)).all() for m, t in tables.items()}
            migration["upgrade"]()
            for model, rows in before.items():
                actual = self.connection.execute(select(model.__table__).order_by(model.id)).all()
                self.assertEqual([dict(r._mapping) for r in rows],
                                 [{k: v for k, v in r._mapping.items() if k != "user_id"} for r in actual])
                self.assertTrue(all(r._mapping["user_id"] is None for r in actual))
            migration["downgrade"]()
            for model, table in tables.items():
                self.assertEqual(self.connection.execute(select(table).order_by(table.c.id)).all(), before[model])
            migration["upgrade"]()

    def test_cli_confirmation_yes_dry_run_and_safe_errors(self):
        from app import claim_legacy
        self.seed()
        with patch.object(claim_legacy, "SessionLocal", self.sessions), patch.object(claim_legacy.engine, "dispose"), \
                patch("builtins.print"), patch("builtins.input", return_value="no") as prompt:
            before = self.snapshot()
            self.assertEqual(claim_legacy.main(["--username", "ownership_target", "--dry-run"]), 0)
            prompt.assert_not_called()
            self.assertEqual(claim_legacy.main(["--username", "ownership_target"]), 0)
            prompt.assert_called_once()
            self.assertEqual(self.snapshot(), before)
            self.assertEqual(claim_legacy.main(["--username", "ownership_target", "--yes"]), 0)
            self.assertEqual(claim_legacy.main(["--username", "missing", "--yes"]), 1)
        error = IntegrityError("sensitive SQL", {"secret": "do-not-print"}, Exception("credentials"))
        with patch.object(claim_legacy, "claim_legacy_data", side_effect=error), \
                patch.object(claim_legacy.engine, "dispose"), patch("builtins.print") as output:
            self.assertEqual(claim_legacy.main(["--username", "ownership_target", "--yes"]), 1)
            self.assertNotIn("do-not-print", str(output.call_args_list))
            self.assertNotIn("credentials", str(output.call_args_list))
