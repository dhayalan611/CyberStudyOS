"""Notes HTTP tests against PostgreSQL; all test rows are rolled back."""

from datetime import datetime
import unittest

import test_labs


class NotesTests(unittest.TestCase):
    # Reuse the existing HTTP server and transaction-isolation harness.
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {
            "title": "OSI Model",
            "content": "The OSI model contains seven layers...",
            "category": "Networking",
            "tags": "networking,osi,ccna",
        }
        payload.update(overrides)
        return self.request("POST", "/api/notes", payload, expected=201)

    def test_existing_endpoints(self):
        self.assertEqual(
            self.request("GET", "/api/db-health"), {"database": "connected"}
        )
        for path in ("/api/courses", "/api/labs", "/api/notes"):
            self.assertIsInstance(self.request("GET", path), list)

    def test_create_get_and_partial_updates(self):
        note = self.create()
        path = f"/api/notes/{note['id']}"
        self.assertFalse(note["pinned"])
        self.assertEqual(note["created_at"], note["updated_at"])
        self.assertEqual(self.request("GET", path), note)
        self.assertIn(note, self.request("GET", "/api/notes"))
        for changes in (
            {"pinned": True}, {"content": "  Updated study notes...\n"},
            {}, {"pinned": True}, {"tags": None},
            {"title": "OSI", "category": "Networks", "tags": "osi", "pinned": False},
        ):
            updated = self.request("PATCH", path, changes)
            self.assertGreater(
                datetime.fromisoformat(updated["updated_at"]),
                datetime.fromisoformat(note["updated_at"]),
            )
            self.assertEqual(updated, {**note, **changes, "updated_at": updated["updated_at"]})
            self.assertEqual(self.request("GET", path), updated)
            note = updated
        self.assertIsNone(self.create(tags=None)["tags"])

    def test_pinned_then_recent_order(self):
        first = self.create(pinned=True)
        second = self.create(pinned=True)
        third = self.create()
        fourth = self.create()
        ids = {note["id"] for note in (first, second, third, fourth)}

        def ordered_ids():
            return [note["id"] for note in self.request("GET", "/api/notes") if note["id"] in ids]

        self.assertEqual(ordered_ids(), [second["id"], first["id"], fourth["id"], third["id"]])
        self.request("PATCH", f"/api/notes/{first['id']}", {})
        self.request("PATCH", f"/api/notes/{third['id']}", {"content": "New"})
        self.assertEqual(ordered_ids(), [first["id"], second["id"], third["id"], fourth["id"]])

    def test_missing_and_invalid_notes(self):
        for method, payload in (("GET", None), ("PATCH", {"pinned": True})):
            self.assertEqual(
                self.request(method, "/api/notes/-1", payload, expected=404),
                {"detail": "Note not found"},
            )
        self.request("POST", "/api/notes", {}, expected=422)
        note = self.create()
        path = f"/api/notes/{note['id']}"
        for field in ("title", "content", "category", "pinned"):
            self.request("PATCH", path, {field: None}, expected=422)
        for payload in (
            {"title": ""}, {"category": ""}, {"title": "x" * 256},
            {"category": "x" * 256}, {"tags": ["osi"]},
            {"created_at": "2026-01-01T00:00:00Z"},
            {"updated_at": "2026-01-01T00:00:00Z"}, {"id": 12},
        ):
            self.request("PATCH", path, payload, expected=422)
        self.assertEqual(self.request("GET", path), note)


if __name__ == "__main__":
    unittest.main()
