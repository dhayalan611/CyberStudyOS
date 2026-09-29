"""Tasks HTTP tests against migrated PostgreSQL; test records are rolled back."""

from datetime import datetime
import unittest

import test_labs


class TasksTests(unittest.TestCase):
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {"title": "Practice VLSM", "category": "Networking"}
        payload.update(overrides)
        return self.request("POST", "/api/tasks", payload, expected=201)

    def test_health_and_existing_endpoints(self):
        self.assertEqual(self.request("GET", "/api/db-health"), {"database": "connected"})
        for path in ("courses", "labs", "notes", "projects", "certifications", "ctf"):
            self.assertIsInstance(self.request("GET", f"/api/{path}"), list)

    def test_create_get_partial_update_and_timestamps(self):
        task = self.create()
        self.assertEqual(task["priority"], "Medium")
        self.assertEqual(task["status"], "To Do")
        self.assertIsNone(task["completed_at"])
        self.assertEqual(task["created_at"], task["updated_at"])
        path = f"/api/tasks/{task['id']}"
        self.assertEqual(self.request("GET", path), task)
        self.assertIn(task, self.request("GET", "/api/tasks"))
        for changes in (
            {"description": "Two subnetting exercises", "priority": "High"},
            {"title": "Updated", "category": "Security", "due_date": "2026-10-01T12:00:00Z"},
            {"description": None, "due_date": None}, {}, {"priority": "High"},
        ):
            updated = self.request("PATCH", path, changes)
            self.assertGreater(datetime.fromisoformat(updated["updated_at"]), datetime.fromisoformat(task["updated_at"]))
            expected = {**task, **changes, "updated_at": updated["updated_at"]}
            if changes.get("due_date"):
                self.assertEqual(datetime.fromisoformat(updated["due_date"]), datetime.fromisoformat(changes["due_date"]))
                expected["due_date"] = updated["due_date"]
            self.assertEqual(updated, expected)
            task = updated
        self.assertEqual(self.request("GET", path), task)

    def test_completion_lifecycle(self):
        task = self.create(status="Completed")
        self.assertIsNotNone(task["completed_at"])
        path = f"/api/tasks/{task['id']}"
        timestamp = task["completed_at"]
        for payload in ({}, {"status": "Completed"}, {"description": "Done"}):
            self.assertEqual(self.request("PATCH", path, payload)["completed_at"], timestamp)
        for status in ("In Progress", "To Do"):
            self.assertIsNone(self.request("PATCH", path, {"status": status})["completed_at"])
            completed = self.request("PATCH", path, {"status": "Completed"})
            self.assertGreater(datetime.fromisoformat(completed["completed_at"]), datetime.fromisoformat(timestamp))
            timestamp = completed["completed_at"]

    def test_ordering(self):
        undated = self.create()
        undated_new = self.create()
        later = self.create(due_date="2026-10-02T00:00:00Z", status="In Progress")
        early = self.create(due_date="2026-10-01T00:00:00Z")
        done = self.create(status="Completed", due_date="2026-09-01T00:00:00Z")
        done_undated = self.create(status="Completed")
        expected = [early, later, undated_new, undated, done, done_undated]
        ids = {task["id"] for task in expected}

        def ordered_ids():
            return [task["id"] for task in self.request("GET", "/api/tasks") if task["id"] in ids]

        self.assertEqual(ordered_ids(), [task["id"] for task in expected])
        self.request("PATCH", f"/api/tasks/{undated['id']}", {})
        expected[2:4] = [undated, undated_new]
        self.assertEqual(ordered_ids(), [task["id"] for task in expected])

    def test_validation_and_missing_tasks(self):
        for method, payload in (("GET", None), ("PATCH", {})):
            self.assertEqual(self.request(method, "/api/tasks/-1", payload, expected=404), {"detail": "Task not found"})
        self.request("POST", "/api/tasks", {}, expected=422)
        task = self.create()
        path = f"/api/tasks/{task['id']}"
        for changes in (
            {"priority": "Urgent"}, {"priority": "high"}, {"status": "Done"},
            {"title": None}, {"category": None}, {"priority": None}, {"status": None},
            {"title": "   "}, {"category": ""}, {"title": "x" * 256},
            {"due_date": "invalid"}, {"completed_at": None}, {"created_at": None},
            {"updated_at": None}, {"id": 100},
        ):
            with self.subTest(changes=changes):
                self.request("PATCH", path, changes, expected=422)
                self.request("POST", "/api/tasks", {"title": "Test", "category": "Test", **changes}, expected=422)
        self.assertEqual(self.request("GET", path), task)
        for priority in ("Low", "Medium", "High"):
            self.assertEqual(self.create(priority=priority)["priority"], priority)

    def test_naive_due_date_is_utc(self):
        task = self.create(due_date="2026-10-01T12:00:00")
        self.assertEqual(datetime.fromisoformat(task["due_date"]), datetime.fromisoformat("2026-10-01T12:00:00Z"))


if __name__ == "__main__":
    unittest.main()
