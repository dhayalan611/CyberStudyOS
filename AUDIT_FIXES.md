# V1 audit fixes

## Behavior

- Course totals represent planned topics. Adding a topic preserves that total; exceeding it expands the total. Completing fewer than all planned topics cannot display 100%. This changes future topic mutations only: no stored totals were backfilled, no migrations were run, and no records were modified during verification. Previously overwritten planned totals cannot be inferred automatically.
- `/cyber-reference` is canonical; `/reference` redirects there. Unknown URLs display a not-found page. All major pages load on demand.
- Learning owns its course-list fetch. Dashboard makes its own single fetch; unrelated pages do not fetch courses. Returning from course details reloads the list.
- API calls share a configurable base URL, cancellation and deadlines. CRUD requests use 15 seconds; AI uses 45 seconds. Writes are never retried automatically. A timed-out write may still have succeeded on the backend: refresh before retrying.
- Mobile shell behavior applies to all pages. Learning controls stack on small screens. Add Course uses a native, scrollable dialog with focus restoration, Escape handling and form submission.
- The fake streak is replaced by a coming-soon label. Global search and notifications are explicitly disabled and labelled coming soon. Dashboard actions are accurately labelled Open Tasks / Open Planner.
- Unmounted demo widgets are marked as legacy samples; detail API functions remain available and are documented. Educational reference data and personalized sidebar text are preserved.
- Environment variants are ignored, with sanitized `.env.example` files available. Backend direct dependencies are pinned to the validated local versions; `requirements-dev.txt` includes the compatible TestClient dependencies.

## Local configuration

The existing backend `.env` is preserved. Use `.env.example` only as a template for a fresh environment; do not overwrite an existing `.env`.

Frontend `VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000`. Set it in `frontend/.env.local` and restart Vite or rebuild. An empty value enables same-origin `/api/...` requests when a reverse proxy is configured. This variable is public; never put credentials in it.

Backend `CORS_ORIGINS` is a JSON array. Defaults allow both `localhost` and `127.0.0.1` on ports 5173 (development) and 4173 (preview). Restart the backend after changing it. No wildcard origin is enabled.

From `backend`, run:

```powershell
.\.venv\Scripts\python.exe run_local.py
```

This binds only to `127.0.0.1`. V1 has no authentication or application-level AI rate limiting; do not expose it through a public interface, tunnel, or proxy. Adding authentication and AI limits is a separate prerequisite for nonlocal deployment. No public deployment was performed.

## Verification

From `frontend`:

```powershell
npm run build
npm run lint
node --test --test-isolation=none tests/*.test.mjs
```

From `backend`:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_ai*.py'
.\.venv\Scripts\python.exe -m unittest discover -s tests -p 'test_course_progress.py'
.\.venv\Scripts\python.exe -m pip check
```

`frontend/tests/audit.browser.mjs` checks production routes and overflow at 390, 1024 and 1440 pixels, redirects, the not-found page, course-fetch scope, and the Add Course dialog at 390 x 550. It expects preview on port 4173 and an isolated headless Chrome with a temporary profile on debugging port 9225. API collections are mocked empty; writes are rejected. These are layout/navigation checks, not end-to-end persistence tests.

No schema changes, migrations, data deletions or live Gemini requests are part of these fixes. Settings and Profile are implemented, with preferences and learner profile data stored separately in this browser. Full record-creation browser tests were not run against the user's database.

### Results

Production build and lint passed. Entry JavaScript is 277.42 kB (previously 518.45 kB); no chunk-size warning. Frontend: 63 tests passed, one optional live check skipped. Backend: 17 mocked AI tests and 5 course-progress tests passed; pip check passed without dependency conflicts. The TestClient deprecation warning is resolved. Browser route/overflow checks passed at all three widths, and modal keyboard checks passed. Health and CORS checks passed; live schema comparison remains zero differences at revision cbfc69511070.
