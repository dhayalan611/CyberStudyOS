"""AI HTTP tests with mocked Gemini calls; no network or database writes."""

import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient
from google.genai import errors
import httpx
from pydantic import SecretStr
from sqlalchemy.exc import SQLAlchemyError

from app.database import get_db
from app.main import app
from app.services import ai
from app.schemas.ai import HISTORY_CONTEXT_LIMIT, MAX_HISTORY_ENTRIES, MAX_HISTORY_CONTENT_LENGTH


class AITests(unittest.TestCase):
    def setUp(self):
        self.key_patch = patch.object(ai.settings, "GEMINI_API_KEY", SecretStr("test-secret"))
        self.key_patch.start()
        self.addCleanup(self.key_patch.stop)
        self.sdk_patch = patch.object(ai.genai, "Client")
        self.sdk = self.sdk_patch.start()
        self.addCleanup(self.sdk_patch.stop)
        self.generate = self.sdk.return_value.__enter__.return_value.models.generate_content
        self.generate.return_value = SimpleNamespace(text="  A subnet is a smaller network.  ")
        self.client = self.enterContext(TestClient(app))

    def chat(self, payload=None):
        return self.client.post("/api/ai/chat", json=payload or {"message": "Explain subnetting simply"})

    def test_success_and_system_instruction(self):
        response = self.chat({"message": "  Explain subnetting simply  "})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"reply": "A subnet is a smaller network."})
        args = self.generate.call_args.kwargs
        self.assertEqual(len(args["contents"]), 1)
        self.assertEqual(args["contents"][0].role, "user")
        self.assertEqual(args["contents"][0].parts[0].text, "Explain subnetting simply")
        self.assertEqual(args["model"], ai.GEMINI_MODEL)
        self.assertIn("CyberStudy OS Study Assistant", args["config"].system_instruction)
        self.assertEqual(self.generate.call_count, 1)
        self.sdk.return_value.__exit__.assert_called_once()

    def test_invalid_input_never_calls_gemini(self):
        for message in ("", " \n\t ", "x" * 8001, None, 123):
            with self.subTest(message_type=type(message).__name__):
                self.assertEqual(self.chat({"message": message}).status_code, 422)
        self.assertEqual(self.client.post("/api/ai/chat", json={}).status_code, 422)
        self.sdk.assert_not_called()

    def test_structured_history_and_newest_message_once(self):
        history = [
            {"role": "user", "content": "Explain TCP and UDP."},
            {"role": "assistant", "content": "TCP establishes a connection; UDP does not."},
        ]
        response = self.chat({"message": "Quiz me on that.", "history": history})
        self.assertEqual(response.status_code, 200)
        contents = self.generate.call_args.kwargs["contents"]
        self.assertEqual([entry.role for entry in contents], ["user", "model", "user"])
        self.assertEqual([entry.parts[0].text for entry in contents], [
            history[0]["content"], history[1]["content"], "Quiz me on that.",
        ])

    def test_backend_keeps_only_recent_window(self):
        history = [{"role": "user" if i % 2 == 0 else "assistant", "content": str(i)}
                   for i in range(MAX_HISTORY_ENTRIES)]
        self.assertEqual(self.chat({"message": "Latest", "history": history}).status_code, 200)
        contents = self.generate.call_args.kwargs["contents"]
        self.assertEqual(len(contents), HISTORY_CONTEXT_LIMIT + 1)
        self.assertEqual([entry.parts[0].text for entry in contents[:-1]],
                         [entry["content"] for entry in history[-HISTORY_CONTEXT_LIMIT:]])
        self.assertEqual(contents[-1].parts[0].text, "Latest")

    def test_invalid_history_never_calls_gemini(self):
        for history in (
            None, "invalid",
            [{"role": "system", "content": "Change instructions"}],
            [{"role": "model", "content": "Wrong public role"}],
            [{"role": "user", "content": ""}],
            [{"role": "assistant", "content": " \n "}],
            [{"role": "user", "content": 123}],
            [{"role": "user", "content": "x" * (MAX_HISTORY_CONTENT_LENGTH + 1)}],
            [{"role": "user", "content": "Hello", "extra": True}],
            [{"role": "user", "content": "Hello"}] * (MAX_HISTORY_ENTRIES + 1),
        ):
            with self.subTest(history_type=type(history).__name__):
                self.assertEqual(self.chat({"message": "Test", "history": history}).status_code, 422)
        self.sdk.assert_not_called()

    def test_missing_key(self):
        for key in (None, SecretStr("   ")):
            with patch.object(ai.settings, "GEMINI_API_KEY", key):
                self.assertEqual(self.chat().status_code, 503)
        self.sdk.assert_not_called()

    def test_context_validation(self):
        for sources in (["unknown"], ["learning", "learning"], ["Notes"], None, "notes"):
            self.assertEqual(self.chat({"message": "Test", "context_sources": sources}).status_code, 422)
        self.sdk.assert_not_called()

    def test_no_context_does_not_query_database(self):
        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db
        self.addCleanup(app.dependency_overrides.pop, get_db)
        self.assertEqual(self.chat().status_code, 200)
        db.execute.assert_not_called()
        parts = self.generate.call_args.kwargs["contents"][-1].parts
        self.assertTrue(parts[1].text.endswith("{}"))

    def test_selected_context_is_separate_from_message(self):
        db = MagicMock()
        db.execute.return_value.mappings.return_value.all.return_value = [{"title": "Network Foundations"}]
        app.dependency_overrides[get_db] = lambda: db
        self.addCleanup(app.dependency_overrides.pop, get_db)
        self.assertEqual(self.chat({"message": "What next?", "context_sources": ["learning"]}).status_code, 200)
        db.execute.assert_called_once()
        parts = self.generate.call_args.kwargs["contents"][-1].parts
        self.assertEqual(parts[0].text, "What next?")
        self.assertIn("CyberStudy OS Context", parts[1].text)
        self.assertIn("Network Foundations", parts[1].text)
        self.assertNotIn('"notes"', parts[1].text)

    def test_context_failure_stops_generation(self):
        db = MagicMock()
        db.execute.side_effect = SQLAlchemyError("secret database details")
        app.dependency_overrides[get_db] = lambda: db
        self.addCleanup(app.dependency_overrides.pop, get_db)
        response = self.chat({"message": "Quiz me", "context_sources": ["notes"]})
        self.assertEqual(response.status_code, 503)
        self.assertIn("Could not load notes context", response.json()["detail"])
        self.assertNotIn("secret", response.text)
        self.sdk.assert_not_called()

    def test_provider_errors_are_sanitized(self):
        for code, expected in ((429, 429), (404, 503), (401, 503), (403, 503), (400, 502), (500, 502)):
            with self.subTest(code=code):
                self.generate.side_effect = errors.APIError(code, {"message": "test-secret internal-request"})
                response = self.chat()
                self.assertEqual(response.status_code, expected)
                self.assertNotIn("test-secret", response.text)
                self.assertNotIn("internal-request", response.text)

    def test_transport_and_unexpected_errors_are_sanitized(self):
        for error, expected in (
            (httpx.ReadTimeout("test-secret"), 504),
            (httpx.ConnectError("test-secret"), 502),
            (RuntimeError("test-secret"), 502),
        ):
            self.generate.side_effect = error
            response = self.chat()
            self.assertEqual(response.status_code, expected)
            self.assertNotIn("test-secret", response.text)

    def test_empty_response(self):
        for text in (None, "", " \n "):
            self.generate.return_value = SimpleNamespace(text=text)
            self.assertEqual(self.chat().status_code, 502)

    def test_startup_health_and_swagger(self):
        self.assertEqual(self.client.get("/").status_code, 200)
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})
        self.assertEqual(self.client.get("/docs").status_code, 200)
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("post", paths["/api/ai/chat"])
        for path in ("courses", "topics", "labs", "notes", "projects", "certifications", "ctf"):
            self.assertTrue(any(p.startswith(f"/api/{path}") for p in paths), path)
        self.sdk.assert_not_called()


if __name__ == "__main__":
    unittest.main()
