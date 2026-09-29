"""Projects HTTP tests against PostgreSQL; test rows are rolled back."""

from datetime import datetime
import unittest

import test_labs


class ProjectsTests(unittest.TestCase):
    # Reuse the existing HTTP server and transaction-isolation harness.
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {"title": "Password Strength Checker", "category": "Cybersecurity"}
        payload.update(overrides)
        return self.request("POST", "/api/projects", payload, expected=201)

    def test_health_and_existing_endpoints(self):
        self.assertEqual(
            self.request("GET", "/api/db-health"), {"database": "connected"}
        )
        for path in ("/api/courses", "/api/labs", "/api/notes", "/api/projects"):
            self.assertIsInstance(self.request("GET", path), list)

    def test_defaults_get_and_partial_updates(self):
        project = self.create()
        path = f"/api/projects/{project['id']}"
        self.assertEqual(project["status"], "Planning")
        self.assertEqual(project["progress"], 0)
        for field in ("description", "technologies", "github_url", "project_url", "started_at", "completed_at"):
            self.assertIsNone(project[field])
        self.assertEqual(project["created_at"], project["updated_at"])
        self.assertEqual(self.request("GET", path), project)
        self.assertIn(project, self.request("GET", "/api/projects"))
        for changes in (
            {"status": "In Progress", "progress": 60},
            {"description": "Python tool for checking password strength."},
            {"title": "Updated checker", "category": "Python", "technologies": "Python,FastAPI,PostgreSQL"},
            {"github_url": "", "project_url": "https://example.com"},
            {}, {"progress": 60},
            {"description": None, "technologies": None, "github_url": None, "project_url": None},
        ):
            updated = self.request("PATCH", path, changes)
            self.assertGreater(
                datetime.fromisoformat(updated["updated_at"]),
                datetime.fromisoformat(project["updated_at"]),
            )
            self.assertEqual(updated, {**project, **changes, "updated_at": updated["updated_at"]})
            self.assertEqual(self.request("GET", path), updated)
            project = updated

    def test_completion_lifecycle(self):
        project = self.create(status="Completed", progress=100, technologies="Python", github_url="", project_url="")
        path = f"/api/projects/{project['id']}"
        timestamp = project["completed_at"]
        self.assertIsNotNone(timestamp)
        self.assertIsNone(project["started_at"])
        for changes in ({"description": "Done"}, {"status": "Completed"}, {}):
            self.assertEqual(self.request("PATCH", path, changes)["completed_at"], timestamp)
        for status in ("In Progress", "On Hold", "Planning"):
            reopened = self.request("PATCH", path, {"status": status})
            self.assertIsNone(reopened["completed_at"])
            # Status does not implicitly change progress or started_at.
            self.assertEqual(reopened["progress"], 100)
            self.assertIsNone(reopened["started_at"])
            completed = self.request("PATCH", path, {"status": "Completed"})
            self.assertGreater(completed["completed_at"], timestamp)
            timestamp = completed["completed_at"]

    def test_manual_started_at(self):
        started = "2026-09-01T09:00:00+00:00"
        project = self.create(started_at=started)
        path = f"/api/projects/{project['id']}"
        self.assertEqual(datetime.fromisoformat(project["started_at"]), datetime.fromisoformat(started))
        updated = self.request("PATCH", path, {"started_at": "2026-09-02T12:00:00Z"})
        self.assertEqual(datetime.fromisoformat(updated["started_at"]), datetime.fromisoformat("2026-09-02T12:00:00Z"))
        self.assertIsNone(self.request("PATCH", path, {"started_at": None})["started_at"])

    def test_recent_order(self):
        first = self.create()
        second = self.create()
        ids = {first["id"], second["id"]}

        def ordered_ids():
            return [project["id"] for project in self.request("GET", "/api/projects") if project["id"] in ids]

        self.assertEqual(ordered_ids(), [second["id"], first["id"]])
        self.request("PATCH", f"/api/projects/{first['id']}", {"progress": 1})
        self.assertEqual(ordered_ids(), [first["id"], second["id"]])

    def test_validation_and_missing_projects(self):
        for method, payload in (("GET", None), ("PATCH", {"progress": 60})):
            self.assertEqual(
                self.request(method, "/api/projects/-1", payload, expected=404),
                {"detail": "Project not found"},
            )
        self.request("POST", "/api/projects", {}, expected=422)
        project = self.create()
        path = f"/api/projects/{project['id']}"
        invalid = [{"progress": value} for value in (-1, 101, 1.5, True, None)]
        invalid += [{field: value} for field in ("title", "category", "status") for value in (None, "", "   ", "x" * 256)]
        invalid += [{"github_url": "x" * 2049}, {"project_url": "x" * 2049}, {"started_at": "invalid"}]
        invalid += [{field: "2026-01-01T00:00:00Z"} for field in ("created_at", "updated_at", "completed_at")]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.request("PATCH", path, payload, expected=422)
                self.request("POST", "/api/projects", {"title": "Checker", "category": "Security", **payload}, expected=422)
        self.assertEqual(self.request("GET", path), project)
        for progress in (0, 100):
            self.assertEqual(self.create(progress=progress)["progress"], progress)
            self.assertEqual(self.request("PATCH", path, {"progress": progress})["progress"], progress)


if __name__ == "__main__":
    unittest.main()
