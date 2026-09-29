"""Database guard regressions; no connections or database writes."""
import unittest
from unittest.mock import patch

from test_database import test_database_url, validate_test_url


class DatabaseSafetyTests(unittest.TestCase):
    def test_separate_test_database_is_allowed(self):
        url = validate_test_url("postgresql+psycopg://localhost/cyberstudy_test", ["postgresql+psycopg://localhost/cyberstudy"])
        self.assertEqual(url.database, "cyberstudy_test")

    def test_development_database_is_rejected_even_through_host_alias(self):
        with self.assertRaises(RuntimeError):
            validate_test_url("postgresql+psycopg://127.0.0.1/my_test", ["postgresql+psycopg://localhost/my_test"])

    def test_unsafe_names_drivers_and_connection_overrides_are_rejected(self):
        for value in ("postgresql+psycopg://localhost/cyberstudy", "postgresql+psycopg://localhost/postgres", "sqlite:///cyberstudy_test", "postgresql+psycopg://localhost/cyberstudy_test?dbname=cyberstudy", "invalid"):
            with self.subTest(value=value), self.assertRaises(RuntimeError):
                validate_test_url(value, [])

    def test_missing_test_configuration_never_falls_back(self):
        with patch.dict("os.environ", {}, clear=True), patch("test_database.dotenv_values", return_value={"DATABASE_URL": "postgresql+psycopg://localhost/cyberstudy"}):
            with self.assertRaisesRegex(RuntimeError, "fallback is forbidden"):
                test_database_url()

    def test_process_test_url_takes_precedence(self):
        with patch.dict("os.environ", {"TEST_DATABASE_URL": "postgresql+psycopg://localhost/process_test"}, clear=True), patch("test_database.dotenv_values", return_value={"TEST_DATABASE_URL": "postgresql+psycopg://localhost/file_test"}):
            self.assertEqual(test_database_url().database, "process_test")
