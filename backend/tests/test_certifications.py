"""Certifications HTTP tests against PostgreSQL; test rows are rolled back."""

from datetime import datetime
import unittest

import test_labs


class CertificationsTests(unittest.TestCase):
    setUpClass = classmethod(test_labs.LabsTests.setUpClass.__func__)
    tearDownClass = classmethod(test_labs.LabsTests.tearDownClass.__func__)
    setUp = test_labs.LabsTests.setUp
    tearDown = test_labs.LabsTests.tearDown
    request = test_labs.LabsTests.request

    def create(self, **overrides):
        payload = {"name": "AWS Academy Cloud Foundations", "issuer": "AWS Academy"}
        return self.request("POST", "/api/certifications", {**payload, **overrides}, expected=201)

    def test_health_and_defaults(self):
        self.assertEqual(self.request("GET", "/api/db-health"), {"database": "connected"})
        certification = self.create()
        self.assertEqual(certification["status"], "Planned")
        for field in ("credential_id", "credential_url", "issue_date", "expiry_date", "notes"):
            self.assertIsNone(certification[field])
        self.assertEqual(certification["created_at"], certification["updated_at"])
        self.assertEqual(self.request("GET", f"/api/certifications/{certification['id']}"), certification)
        self.assertIn(certification, self.request("GET", "/api/certifications"))

    def test_example_partial_updates_and_timestamps(self):
        certification = self.create(
            status="Earned", credential_id="", credential_url="",
            issue_date="2025-12-30", expiry_date=None,
            notes="Completed AWS Academy Cloud Foundations.",
        )
        path = f"/api/certifications/{certification['id']}"
        for changes in (
            {"name": "Updated certification", "issuer": "Updated issuer"},
            {"credential_id": "ABC", "credential_url": "https://example.com/credential"},
            {"expiry_date": "2026-12-30"}, {"status": "Expired"},
            {"notes": "Updated"}, {}, {"notes": "Updated"},
            {"credential_id": None, "credential_url": None, "notes": None, "issue_date": None, "expiry_date": None},
        ):
            updated = self.request("PATCH", path, changes)
            self.assertGreater(datetime.fromisoformat(updated["updated_at"]), datetime.fromisoformat(certification["updated_at"]))
            self.assertEqual(updated, {**certification, **changes, "updated_at": updated["updated_at"]})
            self.assertEqual(self.request("GET", path), updated)
            certification = updated

    def test_dates_validate_final_stored_state(self):
        certification = self.create(issue_date="2025-12-30", expiry_date="2026-12-30")
        path = f"/api/certifications/{certification['id']}"
        for changes in (
            {"issue_date": "2027-01-01"},
            {"expiry_date": "2025-01-01"},
            {"issue_date": "2027-01-01", "expiry_date": "2026-01-01"},
        ):
            self.request("PATCH", path, changes, expected=422)
            self.assertEqual(self.request("GET", path), certification)
        self.request("POST", "/api/certifications", {
            "name": "Invalid dates", "issuer": "Issuer",
            "issue_date": "2027-01-01", "expiry_date": "2026-01-01",
        }, expected=422)
        # Equal dates and moving both dates together are valid.
        for changes in (
            {"issue_date": "2027-01-01", "expiry_date": "2027-01-01"},
            {"expiry_date": None, "issue_date": "2028-01-01"},
            {"issue_date": None, "expiry_date": "2020-01-01"},
        ):
            updated = self.request("PATCH", path, changes)
            for field, value in changes.items():
                self.assertEqual(updated[field], value)
        self.create(issue_date="2025-01-01", expiry_date="2025-01-01")

    def test_status_and_input_validation(self):
        certification = self.create()
        path = f"/api/certifications/{certification['id']}"
        self.request("POST", "/api/certifications", {}, expected=422)
        invalid = [{"status": value} for value in ("Unknown", "earned", "", None)]
        invalid += [{field: value} for field in ("name", "issuer") for value in (None, "", "   ", "x" * 256)]
        invalid += [{field: "invalid"} for field in ("issue_date", "expiry_date")]
        invalid += [{"credential_id": "x" * 256}, {"credential_url": "x" * 2049}]
        invalid += [{field: "2026-01-01T00:00:00Z"} for field in ("created_at", "updated_at")]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.request("PATCH", path, payload, expected=422)
                self.request("POST", "/api/certifications", {"name": "Test", "issuer": "Issuer", **payload}, expected=422)
        self.assertEqual(self.request("GET", path), certification)
        for status in ("Planned", "In Progress", "Earned", "Expired"):
            self.assertEqual(self.create(status=status)["status"], status)
            self.assertEqual(self.request("PATCH", path, {"status": status})["status"], status)

    def test_recent_order_and_missing_records(self):
        first = self.create()
        second = self.create()
        ids = {first["id"], second["id"]}

        def ordered_ids():
            return [item["id"] for item in self.request("GET", "/api/certifications") if item["id"] in ids]

        self.assertEqual(ordered_ids(), [second["id"], first["id"]])
        self.request("PATCH", f"/api/certifications/{first['id']}", {})
        self.assertEqual(ordered_ids(), [first["id"], second["id"]])
        for method, payload in (("GET", None), ("PATCH", {"notes": "Missing"})):
            self.assertEqual(self.request(method, "/api/certifications/-1", payload, expected=404), {"detail": "Certification not found"})


if __name__ == "__main__":
    unittest.main()
