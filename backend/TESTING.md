# Isolated backend tests

Run commands from `backend` using PowerShell. Install `requirements-dev.txt` first.
Integration tests use only `TEST_DATABASE_URL` from the process environment or
`.env.test` (environment takes precedence). There is no development URL fallback.
The shared fixture uses its own engine and overrides FastAPI's database dependency.
Mocked AI tests do not make real Gemini requests.
The application also requires `AUTH_SECRET` in ignored `.env`; see [AUTH.md](AUTH.md)
for setup. Authentication tests share the same guarded database fixture and roll
back their records. Their cookie security override is confined to local HTTP tests.

## Prepare a separate database

Create an empty PostgreSQL database with a name ending in `_test`. For example,
using your local PostgreSQL login (replace `YOUR_POSTGRES_USER`):

```powershell
createdb --host localhost --port 5432 --username YOUR_POSTGRES_USER --password cyberstudy_test
Copy-Item .env.test.example .env.test
```

`--password` prompts without placing the password in command history. If your
login cannot create databases, ask the PostgreSQL administrator to create this
separate database and assign it to your login. Do not recreate or reset an existing
database. Do not overwrite an existing `.env.test` when updating a checkout.

Fill `TEST_DATABASE_URL` in `.env.test` with that connection, percent-encoding
special characters in credentials. The real file is Git-ignored; the example
contains placeholders only. Leave development `.env` and `DATABASE_URL` unchanged.

The safety guard rejects missing configuration, names not ending in `_test`,
names matching either development `.env` or process `DATABASE_URL` (even under
a different hostname), non-Psycopg PostgreSQL URLs, and URL query options.
Each integration test class verifies `current_database()` before any test writes.

## Apply existing migrations to the test database only

This command validates the test URL before setting `DATABASE_URL` for this Python
process only. It does not change the shell environment or development `.env`.

```powershell
.\.venv\Scripts\python.exe -B -c "from test_database import test_database_url; import os; url = test_database_url(); os.environ['DATABASE_URL'] = url.render_as_string(hide_password=False); from alembic.config import Config; from alembic import command; config = Config('alembic.ini'); command.upgrade(config, 'head'); command.current(config)"
```

Use only the existing migration chain; do not generate migrations for test setup.

## Run the complete suite

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -v
```

The fixture prints the verified test database name, never its credentials.
Tests roll back their records but may advance sequences in the test database.
Keep the test database separate and do not point the normal application at it.
Missing or unsafe test configuration is an error, not a skip.

## Ownership verification

The ownership tests cover all eight nullable owner columns, database foreign keys
and indexes, ORM relationships, local claim confirmation/dry-run/idempotence,
preserved owned rows/timestamps, and transaction rollback. They exercise the
ownership migration's downgrade/upgrade against seeded legacy rows inside a
rolled-back PostgreSQL DDL transaction, without committing a test database
downgrade. Do not run concurrent API traffic or other test runs against this
isolated database during migration tests.

The development migration/claim procedure in [OWNERSHIP.md](OWNERSHIP.md) is a
separate deliberate operation; never use it as an integration-test setup command.

## Step 2B authentication and isolation checks

The complete suite includes `test_auth.py`, `test_isolation.py`, Topic/progress
regressions, and AI-context tests. Existing resource fixtures send signed cookies
and a trusted Origin; the two-user isolation fixture exercises the real login
endpoint. Gemini is mocked. Cross-user and NULL-owner accesses fail without
changing records. Unsupported DELETE operations stay unsupported (405).

Run these focused checks from `backend` when diagnosing isolation regressions:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p test_auth.py -v
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p test_isolation.py -v
```

The current head is `0010_user_ownership`. No Step 2B migration is needed.
The frontend includes Login/Register and protected-route session handling, so
401 responses from protected APIs while unauthenticated are expected and are
handled by the frontend session boundary.
