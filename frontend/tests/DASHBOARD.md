# Dashboard verification

## Implementation

- `src/pages/Dashboard.tsx`: replaces sample widgets with four summary cards, today's sessions, priority tasks, learning progress, CTF totals, compact projects/certifications, recent activity, quick actions, loading/empty/unavailable states, and Refresh.
- `src/pages/Dashboard.css`: responsive styles scoped to the Dashboard, including narrow-screen shell adjustments.
- `src/layouts/AppLayout.tsx`: adds a Dashboard-only CSS class; other routes keep their existing layout.
- `src/services/dashboardData.ts`: orchestrates existing services; contains no new fetch URLs or backend API logic.
- `src/utils/dashboard.ts`: Dashboard selection, task ordering, recent-record ordering, and activity derivation.
- `tests/dashboard.test.mjs`: aggregation and resilient-loading tests.
- `tests/dashboard.browser.mjs`: read-only live browser verification via Chrome DevTools Protocol; no added dependency.

No backend, database schema, migration, or package changes.

## Existing APIs and calculations

| Existing service | Existing endpoint | Dashboard use |
| --- | --- | --- |
| `getCourses` | GET `/api/courses` | Active = progress below 100%, including 0%. The API has no course status. Shows up to four courses with their actual progress. |
| `getTasks` | GET `/api/tasks` | Pending = status other than `Completed`. Preview ranks overdue first, then High priority, then earliest due date (undated last within each group), then ID for ties. Shows four. |
| `getChallenges` | GET `/api/ctf` | Reuses `summarizeChallenges`: total records; Completed status count; flags counted strictly from `flag_captured`; points summed only for Completed challenges. |
| `getStudySessions` | GET `/api/study-sessions` | Today's preview compares the local start date with the user's local calendar date using Planner `dateKey`, orders by start instant, and shows four sessions with all statuses. |
| `getProjects` | GET `/api/projects` | Two projects, preferring Planning/In Progress and ordering by latest update within each group. |
| `getCertifications` | GET `/api/certifications` | Two certifications, preferring In Progress and ordering by latest update within each group. |

Study Time reuses Planner `weeklyMinutes` and `formatDuration`: local Monday 00:00 through next Monday 00:00, clipping intervals at both week boundaries. It sums scheduled duration across Planned, Completed, and Skipped sessions, matching the existing Planner. Overlapping sessions each contribute their scheduled duration. This is scheduled time, not measured study time. Local dates and overdue state update every 30 seconds; API records reload on route entry or Refresh.

Recent Activity derives at most five records, newest first. Completed tasks and challenges use their actual completion timestamps; missing/invalid timestamps are skipped. Completed sessions have no completion timestamp, so the UI truthfully labels their `updated_at` as "Completed session updated". Projects/certifications use update time when later than creation, otherwise creation time, with added/updated labels. This is a current-record snapshot, not a historical activity log. Learning is omitted because its service exposes no timestamp.

Six requests run concurrently with `Promise.allSettled`. Results appear independently. Each request has a 15-second timeout. Failure shows a generic unavailable state only for that module, never a misleading zero or raw backend error. Activity indicates incomplete sources. Refresh retries, and unmount aborts requests.

## Run locally

Keep PostgreSQL running. If the servers are not already running, open two PowerShell terminals at the project root:

```powershell
cd backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173/dashboard` (use localhost for the backend's existing CORS configuration).

1. Compare cards with records in My Learning, Tasks, CTF Tracker, and Study Planner. Complete an existing task, return to Dashboard, and confirm Pending decreases. A course at 100% must not count as Active.
2. In Planner, schedule sessions today near 00:00 and 23:59 local time and another tomorrow. Only sessions whose start date is today should appear, in time order. More than four should leave the preview at four. Inspect weekly duration across Sunday/Monday boundaries; only the portion inside this week counts.
3. In Tasks, use overdue Low/High tasks, future High tasks, future Low tasks, and undated tasks. Confirm overdue precedes future, High wins within each overdue group, then earliest due date. Completed tasks must never appear.
4. In CTF, compare flags with the actual flag checkbox independently of status. Only Completed challenge points count.
5. Complete a task/challenge and update a project/certification. Return to Dashboard and confirm the latest five available activity records are sorted by their displayed timestamps. Session updates are labeled as updates.
6. Reload the browser, then click Refresh. Totals should persist because each load reads the API's PostgreSQL-backed records.
7. In browser DevTools, enable Network request blocking for `*127.0.0.1:8000/api/ctf*`. Reload. Only CTF data should be unavailable; other modules should load. Remove the block and click Refresh to recover. Stop the backend to verify all-module unavailable states remain navigable.
8. Use network throttling to inspect loading placeholders. Empty modules should show useful next steps rather than sample records.
9. Click every View link and all five Quick Actions. Check widths around 390, 1024, and 1440 pixels: no horizontal scrolling; cards/sections stack on narrow screens. Mobile navigation remains scrollable above the Dashboard.

## Automated checks

From `frontend`:

```powershell
npm run build
npm run lint
$env:TZ='Asia/Colombo'
node --test --test-isolation=none tests/dashboard.test.mjs tests/studySessions.test.mjs
$env:TZ='America/New_York'
node --test --test-isolation=none tests/dashboard.test.mjs tests/studySessions.test.mjs
Remove-Item Env:TZ
```

For the optional read-only browser check, start an isolated Chrome instance while both servers run:

```powershell
$dashboardProfile = Join-Path $env:TEMP 'cyberstudy-dashboard-check'
Start-Process -FilePath 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList @('--headless=new','--disable-gpu','--remote-debugging-port=9223','--remote-debugging-address=127.0.0.1',('--user-data-dir="' + $dashboardProfile + '"'),'about:blank') -WindowStyle Hidden
node tests/dashboard.browser.mjs
```

The browser script compares rendered totals to live API records, verifies today's preview and CTF points, reload persistence, CTF request failure/recovery, eight navigation routes, and overflow at three widths. Screenshots are saved under ignored `node_modules/.tmp/dashboard-*.png`. It does not create or change database records.

## Verified on 2026-09-26

Production build and ESLint passed. Sixteen Dashboard/Planner tests passed in each timezone, including New York DST behavior. Live browser checks passed with 2 courses, 2 tasks, 3 challenges, 4 sessions, 3 projects, and 3 certifications: 2 Active, 1 Pending, 1 Flag, 2h scheduled this week. Completed CTF points were 100. Desktop/mobile screenshots were inspected. Build retains the existing bundle-size warning over 500 kB.
