# CTF Tracker backend V1

The API stores challenge metadata and a `flag_captured` boolean, with no actual
flag field. Capture and completion are independent. No frontend changes or DELETE
endpoint are included.

## Data and validation

`CTFChallenge` uses the existing SQLAlchemy Base and the `ctf_challenges` table.
Required fields are title, platform, category, and difficulty. Title, platform,
and category are trimmed, nonblank strings up to 255 characters. Difficulty is
`Easy`, `Medium`, or `Hard`; status is `Not Started`, `In Progress`, or `Completed`.

Defaults: status `Not Started`, points `0`, hints_used `0`, flag_captured `false`.
Points and hints_used accept only JSON integers from 0 to 2,147,483,647 (the
PostgreSQL INTEGER limit); booleans, numeric strings, and fractional numbers fail
validation. Flag capture accepts only JSON booleans.

Notes and challenge_url can be omitted, empty, or null. The URL is an optional
string up to 2,048 characters and is never fetched. Unknown request fields,
including `flag` and `flag_value`, are rejected. Actual flag storage is unnecessary
for tracking progress, so no structured field accepts or returns a flag value.

PATCH uses only supplied fields. Null cannot clear required fields, but can clear
notes and challenge_url. Invalid requests return 422 without changing the record.
All timestamps and the ID are server-managed response fields, not editable inputs.

## Status and timestamps

- `Not Started` -> `In Progress` sets started_at only if it is null. It is preserved
  on all subsequent transitions. Creating directly as `In Progress` also sets it.
- Entering `Completed` sets completed_at if it is absent. Creating directly as
  `Completed` sets it too, without inventing a start time.
- Leaving `Completed` clears completed_at. Repeating Completed or editing notes
  preserves the existing completion time. Completing again records a new time.
- A direct `Not Started` -> `Completed` transition does not set started_at; neither
  does reopening directly from `Completed` -> `In Progress` when no start exists.
- Flag capture never changes status; changing status never changes flag capture.
- created_at and updated_at are initialized by PostgreSQL. Every successful PATCH,
  including an empty or unchanged payload, advances updated_at using clock_timestamp().
- Datetimes are timezone-aware. PATCH locks the row to serialize status transitions.

## Migration

Revision `0006`, following `0005`, was generated with Alembic autogenerate. Its
upgrade creates only ctf_challenges, including checks for statuses, difficulties,
and nonnegative counts. The generated migration and offline SQL were inspected
before applying `alembic upgrade head`. No existing table is altered and no
metadata.create_all() is used. The downgrade drops only the CTF table; do not run
it if you want to keep CTF data.

After applying, `alembic check` reported no new upgrade operations. Existing table
row counts and SHA-256 data fingerprints matched before and after migration and
testing. All 18 existing rows across six tables were preserved. Integration test
rows are rolled back; PostgreSQL sequences may advance during tests.

## Test with Swagger UI

From the project root, start or restart the backend with:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs`. For each endpoint, expand it, choose **Try it
out**, fill in the body/path parameters, then choose **Execute**.

1. GET `/api/db-health`: expect 200 and `{"database":"connected"}`.
2. GET `/api/ctf`: expect 200 and a list, initially empty if you have not added data.
3. POST `/api/ctf` with:

   ```json
   {
     "title": "Web Gauntlet",
     "platform": "picoCTF",
     "category": "Web Exploitation",
     "difficulty": "Easy",
     "status": "Not Started",
     "points": 100,
     "flag_captured": false,
     "hints_used": 0,
     "notes": "",
     "challenge_url": ""
   }
   ```

   Expect 201. Copy the returned id. Start and completion times should be null.
4. GET `/api/ctf/{challenge_id}` with that id: expect the created object.
5. PATCH the same id with `{"status":"In Progress"}`: started_at is set.
6. PATCH with `{"flag_captured":true,"hints_used":1}`: status stays In Progress;
   started_at stays unchanged and completed_at remains null.
7. PATCH with `{"status":"Completed"}`: completed_at is set. Repeat the PATCH:
   completed_at stays unchanged, but updated_at advances.
8. PATCH with `{"status":"Not Started"}`: completed_at clears, started_at and
   flag_captured remain unchanged. Return to In Progress: the original start remains.
9. PATCH with `{}`: only updated_at changes. PATCH `{"notes":null}` to clear notes.
10. Try `{"points":-1}`, `{"hints_used":1.5}`, `{"difficulty":"Expert"}`,
    `{"status":"Solved"}`, `{"flag_captured":"true"}`, or `{"flag":"example"}`:
    expect 422. GET again to confirm rejected requests did not modify the record.
11. GET and PATCH id `-1`: expect 404. PATCH can use `{"notes":"missing"}`.
12. Create a second challenge, PATCH the first, then GET `/api/ctf`: the most
    recently updated challenge appears first (descending id breaks timestamp ties).
13. GET `/api/courses`, `/api/labs`, `/api/notes`, `/api/projects`, and
    `/api/certifications`: existing APIs still return their records.

Swagger writes are persistent. There is deliberately no DELETE API in V1.

## Automated verification

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_ctf_challenges.py -v
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
```

Tests use the configured PostgreSQL database and a temporary local HTTP server,
with transaction rollback for test records. The eight CTF tests cover HTTP health,
CRUD within the requested scope, partial updates, validation, independent flag
capture, lifecycle timestamps, ordering, missing IDs, and absence of DELETE.
