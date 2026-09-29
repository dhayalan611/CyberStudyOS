# Study Planner V1 verification

Start the existing backend from `backend` with `.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload`, then run `npm run dev` from `frontend`. Open the Vite URL at `/planner` (normally http://localhost:5173/planner). PostgreSQL must be running with the existing migrations applied.

1. Confirm Today is selected, four summary cards appear, and an empty database shows “No study sessions found.” and “No study sessions scheduled for today.”
2. Schedule **VLSM Practice**, category **Networking**, description **Practice VLSM subnetting questions.**, today's date, 18:00–19:30. Leave status Planned. Confirm a 1h 30m session appears and persists after refreshing.
3. In browser DevTools Network, inspect POST `/api/study-sessions`: start/end include the entered calendar fields and local offset (18:00:00+05:30 in Sri Lanka). A response expressed in UTC must still display 18:00–19:30. `created_at` and `updated_at` are server-supplied.
4. Try equal and reversed start/end times. Confirm the editor stays open with “End time must be later than start time.” and no POST/PATCH occurs. Whitespace-only title/category must also fail.
5. Add a second session earlier today and a session tomorrow in a different category. Confirm Today sorts chronologically. Upcoming shows only future Planned sessions, grouped by local date, including today's sessions if their start is still in the future.
6. Switch to Week. Confirm Monday–Sunday, correct date labels and chronological sessions per day. Previous Week/Next Week move seven calendar days; Today restores the current week. Check a week crossing a month/year boundary and a narrow mobile viewport.
7. Select a category and switch through all three views: every view must respect it. Summary cards remain totals across all categories.
8. Edit a session using its pencil button. Change title, category, description, date, times and status, then Save Changes. Confirm one PATCH occurs on save and the returned object updates the correct day, ordering and totals. Clear description, save, refresh and confirm it remains cleared. Cancel must discard unsaved edits; Escape closes the editor when not saving.
9. Change the card status to Completed, Skipped, then Planned. Each change must PATCH; confirm persistence after refresh. Completed/Skipped sessions disappear from Upcoming but remain in Today/Week. A failed update must retain the previous status and display an error.
10. Study Time This Week counts all statuses, summing only the duration inside the current local Monday–Sunday week, regardless of the displayed week/category. Two sessions of 1h and 45m should add 1h 45m. Completed is an all-time count; Upcoming counts future Planned sessions.
11. Stop FastAPI and refresh: confirm “Unable to load study sessions.” and Try again. Restart it and retry. Stop it while saving to verify the form retains entries and displays an error. DevTools request blocking can simulate this without stopping the backend. Throttle the network to inspect loading and disabled saving controls.
12. For backend validation errors, use a DevTools response override returning HTTP 422 with `{"detail":[{"loc":["body","end_time"],"msg":"end_time must be later than start_time"}]}` for a save request. Confirm the message appears in the editor and it stays open.

These manual steps create real persistent records; V1 intentionally has no delete control. Automated service tests use mocked fetch and do not write to PostgreSQL.

Automated checks from `frontend`:

```powershell
npm run build
npm run lint
node --test --test-isolation=none tests/studySessions.test.mjs
```
