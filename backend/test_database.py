"""Explicit, fail-closed PostgreSQL configuration for integration tests only."""
import os
import re
from pathlib import Path

from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

BACKEND = Path(__file__).resolve().parent


def validate_test_url(value, development_urls):
    try:
        url = make_url(value or "")
        development_names = {
            make_url(item).database.casefold() for item in development_urls if item
        }
    except Exception:
        raise RuntimeError("Invalid database configuration; URLs are withheld.") from None
    name = url.database or ""
    if (url.drivername != "postgresql+psycopg"
            or not re.fullmatch(r"[a-z][a-z0-9_]*_test", name)
            or url.query or name.casefold() in development_names
            or name.casefold() in {"cyberstudy", "postgres", "template0", "template1"}):
        raise RuntimeError("Refusing unsafe test database: use a separate PostgreSQL database ending in _test, without URL query options.")
    return url


def test_database_url():
    local = dotenv_values(BACKEND / ".env.test")
    development = dotenv_values(BACKEND / ".env")
    value = os.environ.get("TEST_DATABASE_URL", local.get("TEST_DATABASE_URL"))
    if not value:
        raise RuntimeError("TEST_DATABASE_URL is required; development database fallback is forbidden.")
    return validate_test_url(value, [development.get("DATABASE_URL"), os.environ.get("DATABASE_URL")])


def integration_engine():
    url = test_database_url()
    engine = create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
    try:
        with engine.connect() as connection:
            actual = connection.execute(text("SELECT current_database()")).scalar_one()
            if actual != url.database:
                raise RuntimeError("Connected database does not match the guarded test database.")
    except Exception:
        engine.dispose()
        raise RuntimeError("Test database identity/connectivity verification failed; connection details withheld.") from None
    print(f"Integration database verified: {actual}")
    return engine
