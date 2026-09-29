"""HTTP integration tests against the migrated database; test rows are rolled back."""

import json
import socket
import threading
import time
import unittest
from urllib.error import HTTPError
from urllib.request import Request, urlopen

import uvicorn
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app
from test_database import integration_engine


class LabsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = integration_engine()
        cls.addClassCleanup(cls.engine.dispose)
        cls.socket = socket.socket()
        cls.socket.bind(("127.0.0.1", 0))
        cls.url = f"http://127.0.0.1:{cls.socket.getsockname()[1]}"
        cls.request_finished = threading.Event()

        async def test_app(scope, receive, send):
            try:
                await app(scope, receive, send)
            finally:
                cls.request_finished.set()

        cls.server = uvicorn.Server(
            uvicorn.Config(test_app, log_level="error", lifespan="off")
        )
        cls.thread = threading.Thread(
            target=cls.server.run, kwargs={"sockets": [cls.socket]}, daemon=True
        )
        cls.thread.start()
        deadline = time.monotonic() + 10
        while not cls.server.started:
            if not cls.thread.is_alive() or time.monotonic() >= deadline:
                cls.server.should_exit = True
                cls.thread.join(timeout=5)
                cls.socket.close()
                raise RuntimeError("Test API server did not start")
            time.sleep(0.01)

    @classmethod
    def tearDownClass(cls):
        cls.server.should_exit = True
        cls.thread.join(timeout=10)
        cls.socket.close()

    def setUp(self):
        self.connection = self.engine.connect()
        self.transaction = self.connection.begin()

        def test_db():
            with Session(
                bind=self.connection, join_transaction_mode="create_savepoint"
            ) as session:
                yield session

        app.dependency_overrides[get_db] = test_db

    def tearDown(self):
        app.dependency_overrides.pop(get_db, None)
        self.transaction.rollback()
        self.connection.close()

    def request(self, method, path, payload=None, expected=200):
        self.request_finished.clear()
        request = Request(
            self.url + path,
            data=json.dumps(payload).encode() if payload is not None else None,
            headers={"Content-Type": "application/json"},
            method=method,
        )
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            raw_body = response.read()
            # FastAPI may finish dependency cleanup after sending the response.
            # Wait before reusing the test connection or rolling back its transaction.
            self.assertTrue(self.request_finished.wait(timeout=10))
            body = json.loads(raw_body)
            self.assertEqual(response.status, expected, body)
            return body

    def create(self, **overrides):
        payload = {
            "title": "Intro to LAN",
            "platform": "TryHackMe",
            "category": "Networking",
            "difficulty": "Easy",
            "notes": "",
            "lab_url": "",
        }
        payload.update(overrides)
        return self.request("POST", "/api/labs", payload, expected=201)

    def test_health_and_existing_courses(self):
        self.assertEqual(
            self.request("GET", "/api/db-health"), {"database": "connected"}
        )
        self.assertIsInstance(self.request("GET", "/api/courses"), list)

    def test_create_list_get_and_partial_updates(self):
        lab = self.create(status="Not Started")
        path = f"/api/labs/{lab['id']}"
        self.assertEqual(lab["status"], "Not Started")
        self.assertIsNone(lab["completed_at"])
        self.assertTrue(lab["created_at"])
        self.assertEqual(self.request("GET", path), lab)
        self.assertIn(lab, self.request("GET", "/api/labs"))
        updated = self.request("PATCH", path, {"status": "In Progress"})
        self.assertEqual(updated, {**lab, "status": "In Progress"})
        notes = "Learned ARP, switching and network topology."
        updated = self.request("PATCH", path, {"notes": notes})
        self.assertEqual(updated, {**lab, "status": "In Progress", "notes": notes})
        self.assertEqual(self.request("PATCH", path, {}), updated)
        cleared = self.request("PATCH", path, {"notes": None, "lab_url": None})
        self.assertIsNone(cleared["notes"])
        self.assertIsNone(cleared["lab_url"])
        self.assertEqual(self.request("GET", path), cleared)

    def test_completion_lifecycle(self):
        lab = self.create()
        self.assertEqual(lab["status"], "Not Started")
        path = f"/api/labs/{lab['id']}"
        completed = self.request("PATCH", path, {"status": "Completed"})
        timestamp = completed["completed_at"]
        self.assertIsNotNone(timestamp)
        for payload in ({"notes": "Done"}, {"status": "Completed"}, {}):
            self.assertEqual(
                self.request("PATCH", path, payload)["completed_at"], timestamp
            )
        for status in ("In Progress", "Not Started"):
            reopened = self.request("PATCH", path, {"status": status})
            self.assertIsNone(reopened["completed_at"])
            completed = self.request("PATCH", path, {"status": "Completed"})
            self.assertGreater(completed["completed_at"], timestamp)
            timestamp = completed["completed_at"]
        self.assertIsNotNone(self.create(status="Completed")["completed_at"])

    def test_all_editable_fields(self):
        lab = self.create()
        changes = {
            "title": "Updated lab", "platform": "Other", "category": "SOC",
            "difficulty": "Hard", "status": "In Progress", "notes": "Updated",
            "lab_url": "https://example.com/lab",
        }
        updated = self.request("PATCH", f"/api/labs/{lab['id']}", changes)
        self.assertEqual(updated, {**lab, **changes})

    def test_missing_labs(self):
        for method, payload in (("GET", None), ("PATCH", {"notes": "missing"})):
            self.assertEqual(
                self.request(method, "/api/labs/-1", payload, expected=404),
                {"detail": "Lab not found"},
            )

    def test_validation(self):
        self.request("POST", "/api/labs", {}, expected=422)
        lab = self.create()
        path = f"/api/labs/{lab['id']}"
        for field in ("title", "platform", "category", "difficulty", "status"):
            for value in (None, "", "   ", "x" * 256):
                with self.subTest(field=field, value=value):
                    self.request("PATCH", path, {field: value}, expected=422)
        for payload in (
            {"completed_at": "2026-01-01T00:00:00Z"},
            {"created_at": "2026-01-01T00:00:00Z"},
            {"id": 123}, {"lab_url": "x" * 2049},
        ):
            self.request("PATCH", path, payload, expected=422)
        self.assertEqual(self.request("GET", path), lab)


if __name__ == "__main__":
    unittest.main()
