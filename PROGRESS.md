# CyberStudy OS progress

## 2026-09-26: Tasks frontend

Connected `/tasks` to the existing FastAPI Tasks endpoints. Supports creating and editing tasks, completing and reopening tasks, search, category/status/priority filters, overdue filtering and summary counts. Due dates display in local time and save with timezone information. Clearing optional fields persists null values. Loading, retry, empty and save-error states are included.

Implementation: `frontend/src/pages/Tasks.tsx`, `frontend/src/components/TaskModal.tsx`, `frontend/src/services/taskApi.ts`, and `frontend/src/utils/tasks.ts`. The backend is unchanged.

Automated checks: `npm run build`, `npm run lint`, and `node --test tests/tasks.test.mjs` from `frontend`. Browser walkthrough: `frontend/tests/TASKS.md`.

Validation results: production build and ESLint passed. All six Tasks tests passed with `node --test --test-isolation=none tests/tasks.test.mjs`; the sandbox blocks the default test runner's subprocess. The production build also required execution outside the sandbox for its Windows subprocess.

## Remaining areas

- Settings and Profile are implemented, with preferences and learner profile data stored separately in this browser.
- Dashboard now uses existing API data; see the Dashboard entry below.
- Tasks browser walkthrough remains to be performed against a running backend.

The repository currently contains untracked project directories; no commit was created during this continuation.

## 2026-09-26: Study Planner V1 frontend

Connected `/planner` to the existing study-session API. Includes Today, Monday–Sunday Week navigation, future Planned sessions grouped by date, category filtering, summary cards, creation/editing, and quick status PATCH updates using returned server records. Local calendar input is sent with an explicit timezone offset; responses display in local time. Weekly duration totals include all statuses and clip intervals at the current week's boundaries. Backend and unrelated modules are unchanged.

Implementation: `frontend/src/pages/StudyPlanner.tsx`, `frontend/src/components/AddStudySessionModal.tsx`, `frontend/src/services/studySessionApi.ts`, `frontend/src/utils/studySessions.ts`, and the `/planner` route in `frontend/src/App.tsx`.

Validation: production build and ESLint passed; eight planner tests passed in both Asia/Colombo and America/New_York (including DST behavior in New York). Vite reports a bundle-size warning. Browser/backend walkthrough remains manual: `frontend/tests/STUDY_PLANNER.md`. Automated service tests mock fetch and do not create database records.

## 2026-09-26: Dashboard overview

Replaced Dashboard sample widgets with existing Learning, Tasks, CTF, Study Planner, Projects, and Certifications service data. Added four summary cards, today's plan, priority tasks, learning progress, CTF totals, compact projects/certifications, timestamp-derived activity, quick actions, independent loading/failure states, and Refresh. Reuses Planner local-date/week helpers and CTF summaries. No backend or schema changes. AppLayout receives only a Dashboard-specific styling class for responsive shell adjustments.

Validation: build and ESLint passed; 16 Dashboard/Planner tests passed in both Asia/Colombo and America/New_York. Read-only Chrome checks against the running PostgreSQL-backed API verified actual totals, today's sessions, CTF points, refresh persistence, isolated CTF failure/recovery, navigation, and widths 390/1024/1440. Screenshots inspected. Existing Vite bundle-size warning remains. Implementation notes and exact test instructions: `frontend/tests/DASHBOARD.md`.

## 2026-09-26: Approved V1 audit fixes

Preserved planned course totals during topic mutations; added the canonical Cyber Reference route, legacy redirect and not-found handling. Scoped course loading to Learning, split page bundles, centralized API URL/deadlines, and configured explicit local CORS origins. Applied responsive shell behavior across routes and made Add Course a scrollable keyboard-accessible dialog. Labelled unfinished controls accurately, documented retained demo widgets/detail helpers, expanded environment ignore rules and added sanitized config examples. Added a loopback-only backend launcher and pinned validated backend/test dependencies. See AUDIT_FIXES.md for behavior and setup details.

Validation: production build passes without the former chunk warning (entry JS 277.42 kB versus 518.45 kB); ESLint passes; 63 frontend tests pass with one optional live check skipped; 17 mocked AI tests and 5 course-progress tests pass. Dependency consistency check passes and the TestClient deprecation warning is resolved. FastAPI lifespan, health and database-health pass; four local CORS origins pass and an unrelated origin is rejected. Read-only metadata comparison remains zero differences at migration cbfc69511070.

Browser verification: all 13 primary routes pass at widths 390/1024/1440 using empty API fixtures and blocked writes; redirects, not-found behavior, course-fetch scope, modal bounds/autofocus/Escape/focus restoration pass. No persistence browser tests or live Gemini calls were made. Existing data, migrations and schema are untouched. Authentication/rate limits remain prerequisites for any future nonlocal deployment; V1 remains local-only.
