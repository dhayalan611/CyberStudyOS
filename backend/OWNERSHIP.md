# Transitional V2 ownership

Migration `0010_user_ownership` extends `0009_create_users`. It adds nullable
integer `user_id` columns to `courses`, `labs`, `notes`, `projects`,
`certifications`, `ctf_challenges`, `tasks`, and `study_sessions`. Each has an
`ix_<table>_user_id` index and a foreign key to `users.id` with `ON DELETE RESTRICT`.
SQLAlchemy provides `resource.user` and corresponding `user.courses`, `user.labs`,
etc. collections. Deleting a user cannot cascade-delete or silently orphan their
resources. Public auth schemas still expose only the existing safe scalar fields.

Topics inherit ownership through their required `course_id`. No redundant
`topics.user_id` is needed. Topic listing, creation, and completion updates verify
the owning Course against the authenticated user. Client course reassignment is
rejected, and course progress queries are scoped to that same owner.

`user_id` is temporarily nullable so V1 records survive unchanged. The migration
does not choose an owner, register a user, or backfill any records. Registration
does not claim anything. Downgrade drops only ownership constraints/indexes/columns;
resource rows survive, but ownership assignments are lost. Do not downgrade after
claiming data without a deliberate recovery plan.

## Authenticated API isolation (Step 2B)

All implemented Course, Topic, Lab, Note, Project, Certification, CTF, Task,
and Study Session operations require a valid authentication cookie. Creates set
`user_id` from the authenticated user; request schemas reject client ownership
fields. Lists filter by that user, and reads/updates return 404 for another user's
or NULL-owned records. Unclaimed legacy records stay hidden. There is no public
ownership-transfer or claim endpoint.

The existing API has no DELETE endpoints. Course updates and individual Topic
GET/DELETE are also unsupported and return 405 for every user; Step 2B does not
add those operations. Supported Topic reads are through the owned course list.
All API responses use `Cache-Control: no-store` to prevent cached private data
from being reused after account changes.

Dashboard PostgreSQL summaries consume the now-scoped resource APIs; static/local
content is unchanged. AI context accepts the same six explicit sources as before,
filters by the authenticated user before applying limits, and excludes NULL-owned
records. Learning context contains course progress, not raw topic text. Tasks,
study sessions, raw topics, and browser-local Profile are not selectable context
sources: requests for those sources are rejected, and their content is not sent.
An empty source list gathers no application context.

Private mutations use the existing exact trusted-Origin check after cookie
validation. The frontend includes Login/Register, cookie-enabled requests, and
protected-route session handling.

## Deliberate local migration and claim

The development database was not migrated or claimed during implementation. Only
the guarded `cyberstudy_test` database was used for migration/testing. The following
commands are for a later, deliberate development-data migration, not test setup.

1. Back up the development database and stop application writes. Review the
   configured `DATABASE_URL` privately; do not paste credentials into logs or shell
   commands. The utility uses this configured database, with no test fallback.
2. From `backend`, deliberately apply the migration chain when ready:

   ```powershell
   .\.venv\Scripts\python.exe -B -m alembic upgrade head
   ```

3. Create your V2 account through `POST /api/auth/register` if it does not exist
   yet; follow [AUTH.md](AUTH.md) for the JSON fields and trusted Origin requirement.
   Verify its username before claiming. No first-account auto-assignment occurs.
4. Substitute that exact username for `YOUR_USERNAME` and preview the claim:

   ```powershell
   .\.venv\Scripts\python.exe -B -m app.claim_legacy --username YOUR_USERNAME --dry-run
   ```

5. Review the target user ID and counts for all eight tables, then run:

   ```powershell
   .\.venv\Scripts\python.exe -B -m app.claim_legacy --username YOUR_USERNAME
   ```

   Type the exact requested `claim <username>` phrase to confirm. For deliberate
   noninteractive use only, append `--yes`; this still prints the preview first.
   No password is accepted. A missing target user fails before any write. EOF,
   interruption, or declined confirmation leaves data unchanged.

This local administrative utility claims **all currently unowned records** in
the eight tables for the specified existing user, including any newly created
NULL-owned records. It cannot distinguish historical V1 records from later
unowned records. Keep application writes stopped and review the counts carefully.
Already-owned rows are never transferred, including rows belonging to the target
user. A repeat run is a no-op if no new unowned rows were added.

The preview captures specific unowned IDs inside a transaction. Inserts after
preview are excluded. Updates recheck `user_id IS NULL`; if an ID was deleted or
claimed concurrently, the entire claim rolls back and must be reviewed again.
Any database failure rolls back all eight tables. Existing content and timestamps
are preserved. Errors do not print connection credentials, password hashes, or
raw SQL parameters. There is no public claim endpoint or browser button.

## Verification and next phase

Follow [TESTING.md](TESTING.md) to migrate and test only `cyberstudy_test`. Ownership
tests use the unchanged database safety guard. Migration roundtrip tests exercise
PostgreSQL transactional DDL and restore their original schema/data on teardown.

`test_isolation.py` exercises two users through real login cookies, cross-user and
NULL-owner access, ownership injection, Topic progress isolation, trusted-origin
checks, all private OpenAPI operations, and mocked Gemini requests in both user
directions. It also verifies that context limits apply after owner filtering and
that unsupported context sources cannot be injected.

Next: frontend Login/Register, session loading through `/api/auth/me`, cookie-enabled
API requests, logout, 401 handling, and clearing per-user UI state on account
changes. Only after deliberate legacy claims should a later migration consider
`user_id NOT NULL`. No such schema change is part of Step 2B.

Reference: [SQLAlchemy relationship deletion behavior](https://docs.sqlalchemy.org/en/20/orm/relationship_api.html).
