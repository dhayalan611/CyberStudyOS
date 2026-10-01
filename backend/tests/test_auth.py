"""Auth integration tests use only the shared guarded PostgreSQL test fixture."""
from datetime import datetime, timedelta, timezone
from http.cookiejar import CookieJar
import json
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

import jwt
from sqlalchemy import select

import test_labs
from app.auth import COOKIE_NAME, password_hasher
from app.config import Settings, settings
from app.main import app
from app.models.user import User
from app.rate_limit import auth_rate_limiter


class AuthTests(unittest.TestCase):
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    tearDown = test_labs.LabsTests.tearDown

    def setUp(self):
        test_labs.LabsTests.setUp(self)
        auth_rate_limiter.reset()
        self.cookies = CookieJar()
        self.client = build_opener(HTTPCookieProcessor(self.cookies))
        self.secure_patch = patch.object(settings, "AUTH_COOKIE_SECURE", False)
        self.secure_patch.start()
        self.addCleanup(self.secure_patch.stop)

    def request(self, method, path, payload=None, expected=200, headers=None):
        self.request_finished.clear()
        request = Request(self.url + "/api/auth/" + path,
                          data=json.dumps(payload).encode() if payload is not None else None,
                          headers=headers if headers is not None else {
                              "Content-Type": "application/json", "Origin": settings.CORS_ORIGINS[0]},
                          method=method)
        try:
            response = self.client.open(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            raw = response.read()
            self.assertTrue(self.request_finished.wait(timeout=10))
            self.assertEqual(response.status, expected, raw.decode())
            self.assertEqual(response.headers["Cache-Control"], "no-store")
            self.last_headers = response.headers
            result = json.loads(raw) if raw else None
            self.assertNotIn("password_hash", raw.decode())
            self.assertNotIn("long test password", raw.decode())
            return result

    def register(self, **overrides):
        payload = {"username": "auth_test", "email": "auth@example.com", "password": "long test password"}
        payload.update(overrides)
        return self.request("POST", "register", payload, 201)

    def login(self, **overrides):
        payload = {"username": "auth_test", "password": "long test password"}
        payload.update(overrides)
        return self.request("POST", "login", payload)

    def test_registration_hash_and_safe_response(self):
        user = self.register(username="  AUTH_TEST  ", email="AUTH@EXAMPLE.COM")
        self.assertEqual(user["username"], "auth_test")
        self.assertEqual(user["email"], "auth@example.com")
        self.assertEqual(set(user), {"id", "username", "email", "created_at", "updated_at"})
        stored_hash = self.connection.scalar(select(User.password_hash).where(User.id == user["id"]))
        self.assertTrue(stored_hash.startswith("$argon2id$"))
        self.assertTrue(password_hasher.verify("long test password", stored_hash))
        self.assertEqual(user["created_at"], user["updated_at"])
        self.assertIsNotNone(datetime.fromisoformat(user["created_at"]).tzinfo)
        self.request("GET", "me", expected=401)

    def test_duplicate_username_and_email(self):
        self.register()
        for username, email in (("AUTH_TEST", "other@example.com"), ("other_user", "AUTH@example.com")):
            self.request("POST", "register", {"username": username, "email": email,
                                               "password": "long test password"}, 409)

    def test_login_me_logout(self):
        user = self.register()
        self.assertEqual(self.login(), user)
        cookie = self.last_headers["Set-Cookie"]
        for attribute in ("HttpOnly", "SameSite=lax", "Path=/", f"Max-Age={settings.AUTH_TOKEN_MINUTES * 60}"):
            self.assertIn(attribute, cookie)
        self.assertNotIn("Secure", cookie)
        self.assertEqual(self.request("GET", "me"), user)
        self.request("POST", "logout", expected=204)
        self.assertIn("Max-Age=0", self.last_headers["Set-Cookie"])
        self.assertEqual(len(self.cookies), 0)
        self.request("GET", "me", expected=401)
        self.request("POST", "logout", expected=204)

    def test_invalid_credentials(self):
        self.register()
        for username, password in (("auth_test", "wrong password"), ("missing_user", "long test password")):
            self.request("POST", "login", {"username": username, "password": password}, 401)
        self.request("GET", "me", expected=401)

    def test_login_rate_limit_counts_successes_and_failures(self):
        self.register()
        with patch.object(settings, "AUTH_LOGIN_RATE_LIMIT", 2):
            self.request("POST", "login", {"username": "auth_test", "password": "wrong password"}, 401)
            self.request("POST", "login", {"username": "auth_test", "password": "long test password"}, 200)
            body = self.request("POST", "login", {"username": "missing_user", "password": "long test password"}, 429)
            self.assertEqual(body["detail"], "Too many authentication attempts. Please wait before trying again.")
            self.assertEqual(self.last_headers["Retry-After"], "60")

    def test_register_rate_limit_and_reset(self):
        with patch.object(settings, "AUTH_REGISTER_RATE_LIMIT", 2):
            self.request("POST", "register", {"username": "auth_one", "email": "one@example.com", "password": "long test password"}, 201)
            self.request("POST", "register", {"username": "auth_two", "email": "two@example.com", "password": "long test password"}, 201)
            body = self.request("POST", "register", {"username": "auth_three", "email": "three@example.com", "password": "long test password"}, 429)
            self.assertEqual(body["detail"], "Too many authentication attempts. Please wait before trying again.")
            self.assertEqual(self.last_headers["Retry-After"], "60")
        auth_rate_limiter.reset()
        self.register(username="auth_after_reset", email="after@example.com")

    def test_invalid_expired_and_deleted_user_tokens(self):
        user = self.register()
        now = datetime.now(timezone.utc)
        valid = {"sub": str(user["id"]), "iat": now, "exp": now + timedelta(minutes=1)}
        secret = settings.AUTH_SECRET.get_secret_value()
        tokens = ["not-a-token", jwt.encode(valid, "x" * 64, algorithm="HS256")]
        for changes in ({"exp": now - timedelta(seconds=1)}, {"sub": "-1"}, {"sub": "2147483648"},
                        {"sub": "invalid"}, {"sub": "2147483647"}, {"iat": now + timedelta(minutes=1)}):
            tokens.append(jwt.encode({**valid, **changes}, secret, algorithm="HS256"))
        for omitted in ("exp", "iat", "sub"):
            tokens.append(jwt.encode({k: v for k, v in valid.items() if k != omitted}, secret, algorithm="HS256"))
        tokens.append(jwt.encode(valid, secret, algorithm="HS384"))
        for token in tokens:
            self.request("GET", "me", expected=401, headers={"Cookie": f"{COOKIE_NAME}={token}"})

    def test_validation_does_not_echo_secrets(self):
        base = {"username": "auth_test", "email": "auth@example.com", "password": "long test password"}
        with patch.object(settings, "AUTH_REGISTER_RATE_LIMIT", 20):
            for changes in ({"username": "ab"}, {"username": "x" * 33}, {"username": "bad name"},
                            {"email": "bad-email"}, {"password": "short"}, {"password": "x" * 129},
                            {"password": {"secret": "long test password"}}, {"extra": "long test password"}):
                body = self.request("POST", "register", {**base, **changes}, 422)
                self.assertTrue(all("input" not in error and "ctx" not in error for error in body["detail"]))
        self.request("POST", "login", {"username": "auth_test", "password": ["long test password"]}, 422)

    def test_origin_csrf_and_cors(self):
        auth_rate_limiter.reset()
        for origin in (None, "null", "https://attacker.example"):
            headers = {"Content-Type": "application/json"}
            if origin is not None:
                headers["Origin"] = origin
            for path in ("register", "login", "logout"):
                self.request("POST", path, {}, 403, headers)
        self.register()
        self.assertEqual(self.last_headers["Access-Control-Allow-Origin"], settings.CORS_ORIGINS[0])
        self.assertEqual(self.last_headers["Access-Control-Allow-Credentials"], "true")

    def test_secure_cookie_and_openapi(self):
        self.register()
        with patch.object(settings, "AUTH_COOKIE_SECURE", True):
            self.login()
            self.assertIn("Secure", self.last_headers["Set-Cookie"])
            self.request("POST", "logout", expected=204)
            self.assertIn("Secure", self.last_headers["Set-Cookie"])
        schema = app.openapi()
        for path in ("register", "login", "logout", "me"):
            self.assertIn("/api/auth/" + path, schema["paths"])
        self.assertEqual(schema["components"]["securitySchemes"]["APIKeyCookie"]["in"], "cookie")


class AuthConfigTests(unittest.TestCase):
    def test_rejects_missing_short_placeholder_secrets_and_wildcard_origins(self):
        from pydantic import ValidationError
        for secret in ("short", "REPLACE_WITH_A_RANDOM_SECRET_OF_AT_LEAST_32_BYTES"):
            with self.assertRaises(ValidationError):
                Settings(_env_file=None, DATABASE_URL="unused", AUTH_SECRET=secret)
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, DATABASE_URL="unused")
        with self.assertRaises(ValidationError):
            Settings(_env_file=None, DATABASE_URL="unused", AUTH_SECRET="a" * 64, CORS_ORIGINS=["*"])
        self.assertTrue(Settings(_env_file=None, DATABASE_URL="unused", AUTH_SECRET="a" * 64).AUTH_COOKIE_SECURE)
