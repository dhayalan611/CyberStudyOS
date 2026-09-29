# Tasks V1 backend

The Tasks API provides GET `/api/tasks`, GET `/api/tasks/{task_id}`, POST
`/api/tasks`, and PATCH `/api/tasks/{task_id}`. Missing task IDs return 404;
invalid inputs return 422. POST returns 201. No DELETE endpoint is provided.

## Data and behavior

`app/models/task.py` uses the existing SQLAlchemy Base. The table stores an
integer primary key, required title and category (up to 255 characters), optional
text description, priority, status, optional due date and completion datetime,
and automatic creation/update timestamps. Datetimes are timezone aware.

`app/schemas/task.py` defines Pydantic v2 TaskCreate, TaskUpdate, and TaskResponse.
Priority accepts exactly `Low`, `Medium`, or `High` (default `Medium`). Status
accepts exactly `To Do`, `In Progress`, or `Completed` (default `To Do`). Title
and category are trimmed and cannot be blank. Unknown fields, including
client-supplied IDs and managed timestamps, are rejected.

PATCH only changes supplied fields. Explicit null clears description or due_date;
it is rejected for required fields. Due dates without a timezone are interpreted
as UTC; prefer sending ISO 8601 timestamps with an explicit offset.

Creating or updating a completed task sets completed_at when it is null. Further
edits while completed preserve that timestamp. Reopening the task clears it.
Every successful PATCH advances updated_at, including `{}` and unchanged values;
created_at stays unchanged. PATCH locks the task row during the update.

Lists sort incomplete tasks first, then due dates ascending with missing dates
last within each completion group, then updated_at descending, created_at
descending, and ID descending for deterministic ties.

## Migration

`alembic/versions/022419ef08e9_create_tasks_table.py` follows revision `0006`.
Its upgrade only creates `tasks`; Alembic also updates its revision marker.
The generated migration was inspected and applied with the existing Alembic
configuration. Existing table record counts and content fingerprints matched
before and after. `alembic check` reported no pending model changes.
Do not downgrade this migration unless you intend to remove the tasks table.

## Swagger walkthrough

From the project root in PowerShell, start the backend (skip if already running):

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

1. Open http://127.0.0.1:8000/docs.
2. Expand GET `/api/db-health`, select **Try it out**, then **Execute**.
   Expect 200 and `{"database":"connected"}`.
3. Under **Tasks**, expand POST `/api/tasks`, select **Try it out**, and paste:

```json
{
  "title": "Practice VLSM",
  "description": "Complete two VLSM subnetting exercises.",
  "category": "Networking",
  "priority": "High",
  "status": "To Do",
  "due_date": null
}
```

4. Execute and expect 201. Copy the response's `id`.
5. Execute GET `/api/tasks`; the new task appears in the list.
6. Execute GET `/api/tasks/{task_id}` using that ID; expect the same task.
7. Execute PATCH `/api/tasks/{task_id}` with `{"status":"Completed"}`.
   Expect a non-null completed_at and a newer updated_at.
8. PATCH with `{"description":"Finished both exercises."}`. The completion
   timestamp stays the same and updated_at advances.
9. PATCH with `{"status":"In Progress"}`. completed_at becomes null.
10. PATCH with `{"priority":"Urgent"}` returns 422 without saving changes.
    GET or PATCH with task_id `-1` returns 404.

Swagger creates real persistent tasks. Automated tests instead roll back their
test records using the existing PostgreSQL test harness:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

The frontend and AI endpoint/context system are unchanged.
