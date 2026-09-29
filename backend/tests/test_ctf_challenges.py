"""CTF HTTP integration tests against PostgreSQL; test rows are rolled back."""

from datetime import datetime
import unittest

import test_labs


class CTFChallengesTests(unittest.TestCase):
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {
            "title": "Web Gauntlet", "platform": "picoCTF",
            "category": "Web Exploitation", "difficulty": "Easy",
        }
        payload.update(overrides)
        return self.request("POST", "/api/ctf", payload, expected=201)

    def test_health_and_existing_apis(self):
        self.assertEqual(self.request("GET", "/api/db-health"), {"database": "connected"})
        self.assertEqual(self.request("GET", "/api/health"), {"status": "ok"})
        for resource in ("courses", "labs", "notes", "projects", "certifications", "ctf"):
            self.assertIsInstance(self.request("GET", f"/api/{resource}"), list)
        for course in self.request("GET", "/api/courses"):
            self.assertIsInstance(self.request("GET", f"/api/courses/{course['id']}/topics"), list)

    def test_defaults_create_get_and_partial_patch(self):
        challenge = self.create()
        path = f"/api/ctf/{challenge['id']}"
        self.assertEqual(challenge["status"], "Not Started")
        self.assertEqual(challenge["points"], 0)
        self.assertEqual(challenge["hints_used"], 0)
        self.assertIs(challenge["flag_captured"], False)
        for field in ("notes", "challenge_url", "started_at", "completed_at"):
            self.assertIsNone(challenge[field])
        self.assertEqual(challenge["created_at"], challenge["updated_at"])
        self.assertIsNotNone(datetime.fromisoformat(challenge["created_at"]).tzinfo)
        self.assertEqual(self.request("GET", path), challenge)
        self.assertIn(challenge, self.request("GET", "/api/ctf"))
        example = self.create(status="Not Started", points=100, flag_captured=False, hints_used=0, notes="", challenge_url="")
        self.assertEqual(example["notes"], "")
        self.assertEqual(example["challenge_url"], "")
        for changes in (
            {"notes": "Learned request parsing", "points": 100, "hints_used": 2},
            {"title": " Updated ", "platform": "Other", "category": "Crypto", "difficulty": "Hard"},
            {"challenge_url": "https://example.com/challenge"},
            {"notes": None, "challenge_url": None}, {}, {"points": 100},
        ):
            updated = self.request("PATCH", path, changes)
            normalized = {key: value.strip() if isinstance(value, str) else value for key, value in changes.items()}
            self.assertEqual(updated, {**challenge, **normalized, "updated_at": updated["updated_at"]})
            self.assertGreater(datetime.fromisoformat(updated["updated_at"]), datetime.fromisoformat(challenge["updated_at"]))
            self.assertEqual(self.request("GET", path), updated)
            challenge = updated

    def test_start_and_completion_lifecycle(self):
        challenge = self.create()
        path = f"/api/ctf/{challenge['id']}"
        active = self.request("PATCH", path, {"status": "In Progress"})
        started = active["started_at"]
        self.assertIsNotNone(started)
        self.assertIsNone(active["completed_at"])
        for changes in ({"status": "In Progress"}, {"notes": "Working"}, {}, {"status": "Not Started"}, {"status": "In Progress"}):
            self.assertEqual(self.request("PATCH", path, changes)["started_at"], started)
        completed = self.request("PATCH", path, {"status": "Completed"})
        timestamp = completed["completed_at"]
        self.assertIsNotNone(timestamp)
        self.assertFalse(completed["flag_captured"])
        for changes in ({"status": "Completed"}, {"notes": "Done"}, {}):
            updated = self.request("PATCH", path, changes)
            self.assertEqual(updated["completed_at"], timestamp)
            self.assertEqual(updated["started_at"], started)
        for status in ("In Progress", "Not Started"):
            reopened = self.request("PATCH", path, {"status": status})
            self.assertIsNone(reopened["completed_at"])
            self.assertEqual(reopened["started_at"], started)
            completed = self.request("PATCH", path, {"status": "Completed"})
            self.assertGreater(datetime.fromisoformat(completed["completed_at"]), datetime.fromisoformat(timestamp))
            timestamp = completed["completed_at"]

    def test_creation_states_and_direct_completion(self):
        active = self.create(status="In Progress")
        self.assertIsNotNone(active["started_at"])
        self.assertIsNone(active["completed_at"])
        completed = self.create(status="Completed")
        self.assertIsNotNone(completed["completed_at"])
        self.assertIsNone(completed["started_at"])
        fresh = self.create()
        path = f"/api/ctf/{fresh['id']}"
        direct = self.request("PATCH", path, {"status": "Completed"})
        self.assertIsNotNone(direct["completed_at"])
        self.assertIsNone(direct["started_at"])
        # Only the specified Not Started -> In Progress transition auto-starts.
        reopened = self.request("PATCH", path, {"status": "In Progress"})
        self.assertIsNone(reopened["started_at"])
        self.assertIsNone(reopened["completed_at"])

    def test_flag_capture_is_independent(self):
        for status in ("Not Started", "In Progress", "Completed"):
            challenge = self.create(status=status, flag_captured=True)
            path = f"/api/ctf/{challenge['id']}"
            self.assertEqual(challenge["status"], status)
            for captured in (False, True):
                updated = self.request("PATCH", path, {"flag_captured": captured})
                self.assertIs(updated["flag_captured"], captured)
                self.assertEqual(updated["status"], status)
                self.assertEqual(updated["started_at"], challenge["started_at"])
                self.assertEqual(updated["completed_at"], challenge["completed_at"])
        self.assertNotIn("flag", challenge)
        self.assertNotIn("flag_value", challenge)

    def test_recently_updated_order(self):
        first, second = self.create(), self.create()
        ids = {first["id"], second["id"]}

        def ordered_ids():
            return [item["id"] for item in self.request("GET", "/api/ctf") if item["id"] in ids]

        self.assertEqual(ordered_ids(), [second["id"], first["id"]])
        self.request("PATCH", f"/api/ctf/{first['id']}", {})
        self.assertEqual(ordered_ids(), [first["id"], second["id"]])

    def test_missing_challenges_and_no_delete(self):
        for method, payload in (("GET", None), ("PATCH", {"notes": "missing"})):
            self.assertEqual(self.request(method, "/api/ctf/-1", payload, expected=404), {"detail": "CTF challenge not found"})
        self.request("DELETE", "/api/ctf/-1", expected=405)

    def test_validation_rejects_invalid_payloads_without_changes(self):
        self.request("POST", "/api/ctf", {}, expected=422)
        challenge = self.create()
        path = f"/api/ctf/{challenge['id']}"
        base = {"title": "Web Gauntlet", "platform": "picoCTF", "category": "Web", "difficulty": "Easy"}
        for field in base:
            self.request("POST", "/api/ctf", {key: value for key, value in base.items() if key != field}, expected=422)
        invalid = [{field: value} for field in ("points", "hints_used") for value in (-1, 1.5, True, "1", None, 2_147_483_648)]
        invalid += [{field: value} for field in ("title", "platform", "category") for value in (None, "", "   ", "x" * 256)]
        invalid += [{field: value} for field in ("status", "difficulty") for value in (None, "", "Unknown", "easy", "completed")]
        invalid += [{"flag_captured": value} for value in (None, 1, 0, "true", "false")]
        invalid += [{"challenge_url": "x" * 2049}]
        invalid += [{field: "2026-09-01T12:00:00Z"} for field in ("started_at", "completed_at", "created_at", "updated_at")]
        invalid += [{"flag": "not-accepted"}, {"flag_value": "not-accepted"}, {"id": 123}]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.request("POST", "/api/ctf", {**base, **payload}, expected=422)
                self.request("PATCH", path, payload, expected=422)
        self.assertEqual(self.request("GET", path), challenge)
        for difficulty in ("Easy", "Medium", "Hard"):
            self.assertEqual(self.create(difficulty=difficulty)["difficulty"], difficulty)
        for value in (0, 2_147_483_647):
            self.assertEqual(self.create(points=value, hints_used=value)["points"], value)
            self.assertEqual(self.request("PATCH", path, {"points": value, "hints_used": value})["hints_used"], value)


if __name__ == "__main__":
    unittest.main()
