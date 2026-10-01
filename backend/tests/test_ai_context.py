import unittest
from datetime import date
from unittest.mock import MagicMock

from sqlalchemy.dialects import postgresql

from app.services.ai_context import (
    MAX_RECORDS_PER_SOURCE, MAX_NOTE_CHARACTERS, MAX_FIELD_CHARACTERS,
    context_query, load_context,
)


class ContextTests(unittest.TestCase):
    def test_each_source_has_bounded_projection(self):
        forbidden = {"credential_id", "credential_url", "lab_url", "challenge_url", "github_url", "project_url", "description"}
        for source, limit in MAX_RECORDS_PER_SOURCE.items():
            db = MagicMock()
            db.execute.return_value.mappings.return_value.all.return_value = [{"title": str(i)} for i in range(limit + 1)]
            result = load_context(db, [source], user_id=42)
            self.assertEqual(list(result), [source])
            self.assertEqual(len(result[source]["records"]), limit)
            self.assertTrue(result[source]["has_more_records"])
            query = db.execute.call_args.args[0]
            sql = str(query.compile(dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}))
            self.assertIn(f"LIMIT {limit + 1}", sql)
            self.assertIn("user_id = 42", sql)
            self.assertFalse(forbidden.intersection(query.selected_columns.keys()))
            self.assertNotIn("notes", query.selected_columns.keys())
            self.assertIn(str(MAX_FIELD_CHARACTERS), sql)
            if source == "notes":
                self.assertIn(str(MAX_NOTE_CHARACTERS), sql)
                self.assertIn("content_excerpt", query.selected_columns.keys())

    def test_empty_source_is_explicit_and_dates_serialize(self):
        db = MagicMock()
        db.execute.return_value.mappings.return_value.all.return_value = []
        result = load_context(db, ["ctf"], user_id=42)
        self.assertEqual(result["ctf"]["records"], [])
        self.assertFalse(result["ctf"]["has_more_records"])
        db.execute.return_value.mappings.return_value.all.return_value = [{"issue_date": date(2026, 1, 1), "expiry_date": None}]
        record = load_context(db, ["certifications"], user_id=42)["certifications"]["records"][0]
        self.assertEqual(record, {"issue_date": "2026-01-01", "expiry_date": None})

    def test_unknown_source_has_no_query(self):
        with self.assertRaises(ValueError):
            context_query("arbitrary_table", user_id=42)
