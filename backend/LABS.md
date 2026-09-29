# Labs backend

The Labs API uses the existing PostgreSQL database and SQLAlchemy Base.
Revision `0002_create_labs_table.py` follows `0001` and creates only `labs`.
No course/topic tables or data are modified by this upgrade. No relationships,
authentication, DELETE endpoint, or frontend changes are included.

## Model and validation

| Field | Database type | Behavior |
| --- | --- | --- |
| id | Integer primary key | Generated automatically |
| title | VARCHAR(255) | Required, nonblank |
| platform | VARCHAR(255) | Required, nonblank |
| category | VARCHAR(255) | Required, nonblank |
| difficulty | VARCHAR(255) | Required, nonblank |
| status | VARCHAR(255) | Defaults to `Not Started`; nonblank |
| notes | TEXT | Optional, nullable |
| lab_url | VARCHAR(2048) | Optional, nullable; accepts an empty string |
| completed_at | Timestamp with time zone | Nullable; managed by the API |
| created_at | Timestamp with time zone | Database defaults to the current time |

Platform, difficulty, and status are strings, not restricted enums. Suggested
platforms: TryHackMe, LetsDefend, CyberDefenders, Cisco, Hack The Box, Other.
Suggested difficulties: Easy, Medium, Hard. Suggested statuses: Not Started,
In Progress, Completed. Only the exact status `Completed` triggers completion.

Schemas use Pydantic v2 `ConfigDict`, `field_validator`, and `model_dump`.
Responses use `from_attributes=True`. Unknown request fields are rejected.
IDs and timestamps are response-only fields.

PATCH uses `model_dump(exclude_unset=True)`: omitted fields retain their saved
values. An empty object is a no-op. Explicit `null` clears notes or lab_url;
it is rejected for required fields. Input strings have surrounding whitespace
removed. Each PATCH locks its lab row until commit to serialize concurrent edits.

Entering `Completed` sets completed_at to the current UTC datetime. Creating a
lab already marked `Completed` also sets it. Repeating `Completed` or editing
notes preserves the timestamp. Leaving `Completed` clears it; completing again
sets a new timestamp.

## Test with FastAPI Swagger UI

From the project root, start (or restart) the backend:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000/docs. For each endpoint, expand it, click **Try it out**,
enter parameters/body, then click **Execute**.

1. `GET /api/db-health`: expect 200 and `{"database":"connected"}`.
2. `GET /api/courses`: expect 200 and your existing courses.
3. `GET /api/labs`: expect 200 and an array (initially empty).
4. `POST /api/labs`: enter the following body. Expect 201, an integer `id`,
   a generated `created_at`, and `completed_at: null`. Save the returned ID.

```json
{
  "title": "Intro to LAN",
  "platform": "TryHackMe",
  "category": "Networking",
  "difficulty": "Easy",
  "status": "Not Started",
  "notes": "",
  "lab_url": ""
}
```

5. `GET /api/labs/{lab_id}`: enter that ID; expect 200 and the created lab.
6. `PATCH /api/labs/{lab_id}`: use the same ID and execute each body below
   separately. Expect 200 and the full updated lab after each request.

```json
{"status": "In Progress"}
```

```json
{"notes": "Learned ARP, switching and network topology."}
```

The notes request must retain status `In Progress` and all other saved fields.

```json
{"status": "Completed"}
```

Expect a non-null completed_at. Execute the same body again: the timestamp must
stay unchanged. Then reopen the lab:

```json
{"status": "In Progress"}
```

Expect completed_at to return to null. Optional fields can be cleared with:

```json
{"notes": null, "lab_url": null}
```

7. Repeat GET by ID and GET all labs to verify the saved changes. Restarting
   the backend should retain this manually created lab.
8. GET and PATCH with `lab_id: -1` should return 404 and
   `{"detail":"Lab not found"}`. Use `{"notes":"missing"}` for the PATCH body.
9. PATCH `{"title":null}` or `{"status":""}` should return 422 without
   modifying the lab. POST with missing required fields should also return 422.

Manual Swagger writes persist in your database.

## Automated checks

From `backend`, with PostgreSQL running and migrations applied:

```powershell
.\.venv\Scripts\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic check
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: `0002 (head)`, no new upgrade operations, and six passing tests.
Tests start a temporary local HTTP server on an available port and use the
configured PostgreSQL database. Test requests use savepoints inside an outer
transaction; test rows are rolled back. PostgreSQL ID sequences can advance
even when rows are rolled back, so IDs may have gaps. No extra test dependencies
are required.
