"""Study Sessions HTTP tests; all test records are rolled back."""

from datetime import datetime
import unittest

import test_labs


class StudySessionsTests(unittest.TestCase):
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {
            "title": "VLSM Practice", "category": "Networking",
            "description": "Practice VLSM subnetting questions.",
            "start_time": "2026-09-28T18:00:00", "end_time": "2026-09-28T19:00:00",
        }
        payload.update(overrides)
        return self.request("POST", "/api/study-sessions", payload, expected=201)

    def test_health_and_existing_endpoints(self):
        self.assertEqual(self.request("GET", "/api/db-health"), {"database": "connected"})
        for path in ("courses", "labs", "notes", "projects", "certifications", "ctf", "tasks"):
            self.assertIsInstance(self.request("GET", f"/api/{path}"), list)

    def test_create_get_and_partial_updates(self):
        session = self.create()
        self.assertEqual(session["status"], "Planned")
        self.assertEqual(session["created_at"], session["updated_at"])
        path = f"/api/study-sessions/{session['id']}"
        self.assertEqual(self.request("GET", path), session)
        self.assertIn(session, self.request("GET", "/api/study-sessions"))
        for changes in (
            {"title": "Updated", "category": "Security"}, {"description": None},
            {"status": "Completed"}, {"status": "Skipped"}, {"status": "Planned"},
            {}, {"status": "Planned"},
        ):
            updated = self.request("PATCH", path, changes)
            self.assertGreater(datetime.fromisoformat(updated["updated_at"]), datetime.fromisoformat(session["updated_at"]))
            self.assertEqual(updated, {**session, **changes, "updated_at": updated["updated_at"]})
            session = updated
        self.assertEqual(self.request("GET", path), session)

    def test_patch_validates_combined_state_without_mutation(self):
        session = self.create()
        path = f"/api/study-sessions/{session['id']}"
        for changes in (
            {"start_time": "2026-09-28T20:00:00"},
            {"start_time": "2026-09-28T19:00:00"},
            {"end_time": "2026-09-28T17:00:00"},
            {"end_time": "2026-09-28T18:00:00"},
            {"title": "Must not save", "status": "Completed", "end_time": "2026-09-28T17:00:00"},
            {"start_time": "2026-09-28T20:00:00", "end_time": "2026-09-28T19:00:00"},
        ):
            with self.subTest(changes=changes):
                self.request("PATCH", path, changes, expected=422)
                self.assertEqual(self.request("GET", path), session)
        # Moving both boundaries must not be compared against the old boundary.
        moved = self.request("PATCH", path, {"start_time": "2026-09-28T20:00:00Z", "end_time": "2026-09-28T21:00:00Z"})
        self.assertEqual(datetime.fromisoformat(moved["start_time"]), datetime.fromisoformat("2026-09-28T20:00:00Z"))
        earlier = self.request("PATCH", path, {"start_time": "2026-09-28T19:00:00"})
        self.assertEqual(earlier["end_time"], moved["end_time"])
        later = self.request("PATCH", path, {"end_time": "2026-09-28T22:00:00"})
        self.assertEqual(later["start_time"], earlier["start_time"])

    def test_validation_and_missing_sessions(self):
        for method, payload in (("GET", None), ("PATCH", {})):
            self.assertEqual(self.request(method, "/api/study-sessions/-1", payload, expected=404), {"detail": "Study session not found"})
        self.request("POST", "/api/study-sessions", {}, expected=422)
        session = self.create()
        base = {field: session[field] for field in ("title", "category", "description", "start_time", "end_time", "status")}
        path = f"/api/study-sessions/{session['id']}"
        invalid = [
            {"status": "Done"}, {"status": "planned"}, {"title": "   "}, {"category": ""},
            {"title": "x" * 256}, {"category": "x" * 256},
            {"start_time": "invalid"}, {"end_time": "invalid"},
            {"end_time": base["start_time"]}, {"end_time": "2026-09-28T17:00:00Z"},
            {"id": 42}, {"created_at": None}, {"updated_at": None}, {"task_id": 1},
        ] + [{field: None} for field in ("title", "category", "start_time", "end_time", "status")]
        for changes in invalid:
            with self.subTest(changes=changes):
                self.request("POST", "/api/study-sessions", {**base, **changes}, expected=422)
                self.request("PATCH", path, changes, expected=422)
        self.assertEqual(self.request("GET", path), session)
        for status in ("Planned", "Completed", "Skipped"):
            self.assertEqual(self.create(status=status)["status"], status)
        trimmed = self.create(title="  Study  ", category="  Networking  ")
        self.assertEqual((trimmed["title"], trimmed["category"]), ("Study", "Networking"))

    def test_timezone_convention_and_instant_validation(self):
        session = self.create()
        self.assertEqual(datetime.fromisoformat(session["start_time"]), datetime.fromisoformat("2026-09-28T18:00:00Z"))
        offset = self.create(start_time="2026-09-28T18:00:00+05:30", end_time="2026-09-28T13:30:00Z")
        self.assertEqual(datetime.fromisoformat(offset["start_time"]), datetime.fromisoformat("2026-09-28T12:30:00Z"))
        path = f"/api/study-sessions/{offset['id']}"
        self.request("PATCH", path, {"end_time": "2026-09-28T12:30:00Z"}, expected=422)
        self.assertEqual(self.request("GET", path), offset)

    def test_ordering_by_start_time_with_stable_ties(self):
        later = self.create(start_time="2026-09-29T18:00:00Z", end_time="2026-09-29T19:00:00Z")
        early = self.create(status="Completed")
        tied = self.create(status="Skipped")
        offset = self.create(start_time="2026-09-28T18:00:00+05:30", end_time="2026-09-28T19:00:00+05:30")
        expected = [offset, early, tied, later]
        ids = {session["id"] for session in expected}
        result = [session["id"] for session in self.request("GET", "/api/study-sessions") if session["id"] in ids]
        self.assertEqual(result, [session["id"] for session in expected])


if __name__ == "__main__":
    unittest.main()
