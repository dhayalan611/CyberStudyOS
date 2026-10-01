# V2 frontend authentication

The `develop-v2` frontend uses the existing FastAPI authentication contract.
This completes the frontend step anticipated by the backend foundation documents.
It does not migrate development data or establish public deployment readiness.

## Login and registration

`/login` accepts username and password. `/register` accepts username, email,
password and a client-side password confirmation. Usernames use 3–32 ASCII letters,
digits or underscores and are normalized to lowercase. Registration passwords
use 12–128 characters without trimming or added complexity rules. Email is at most
254 characters; the server remains the authority for email validation.

Registration returns a public user but does not set a session: the UI returns to
Login with a confirmation message. Login restores the intended local route,
including its query/hash, or opens `/dashboard`. External and auth-loop destinations
are rejected. Forms provide labels, password autocomplete, validation/error messages,
visible keyboard focus and pending guards. Duplicate username/email uses the same
safe conflict message as the backend contract. Raw server diagnostics are never shown.

## Session and private state

Startup calls `GET /api/auth/me`. While unresolved, only the session screen is shown.
The memory-only session store exposes loading, authenticated, unauthenticated and
recoverable error states plus the current public user. A backend/network outage
offers retry without exposing the private shell.

The protected shell covers Dashboard, Learning and course details, Labs and lab
details, Notes, Projects, Certifications, CTF, Tasks, Planner, AI, Settings and
Profile. Reference pages and the not-found view also remain inside this shell.

All services use `apiFetch`, which forces `credentials: "include"` and
`cache: "no-store"`. The browser sends the backend-managed HttpOnly cookie and
Origin header. JavaScript never reads cookies, handles JWTs or stores credentials.
Only the public user fields are retained from authentication responses.

A private API 401 invalidates the session centrally, unmounts the private shell
and redirects to Login. Auth endpoint 401s are handled separately to avoid loops.
Every identity transition aborts requests from the old session and increments a
revision. The shell is keyed by user ID and revision, so all page-local resource
state, Dashboard data, AI messages/drafts and selected AI context are recreated.
Late old-session responses cannot populate the new session.

Topbar shows username and Logout. Logout posts `/api/auth/logout` and immediately
hides private UI. Success returns to Login; failure keeps private UI hidden and
offers retry so the user can complete server-cookie removal. It does not falsely
claim that a failed request removed the cookie.

Profile and Settings retain their existing localStorage keys. They are browser-local,
shared across accounts on that browser, and survive logout. Profile is not sent to
Gemini. No database records are removed by auth transitions.

## Local configuration

Use the same hostname on frontend and backend. Without an explicit
`VITE_API_BASE_URL`, the frontend follows its browser hostname on API port 8000,
so both `http://localhost:5173` and `http://127.0.0.1:5173` stay same-site. If
you set `VITE_API_BASE_URL`, its hostname must match the UI hostname.
Add the exact frontend origin to backend `CORS_ORIGINS` (including its port).
Local HTTP requires backend `AUTH_COOKIE_SECURE=false`; HTTPS deployment requires
Secure cookies. Keep `AUTH_SECRET` and Gemini credentials on the backend only.
See [backend authentication](../backend/AUTH.md) for the server configuration.

## Verification

From `frontend`, with dependencies already installed and Node 24:

```powershell
npm test
npm run build
npm run lint
```

`npm test` runs all Node unit/service tests without child-process isolation, which
also works in environments that restrict spawning test workers. The optional live
CTF read test remains opt-in and is skipped by default.

For browser tests, run `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`
against the production build. Start a separate headless Chrome with a new temporary
profile and debugging port 9225, then run `npm run test:browser`:

```powershell
$authTestProfile = Join-Path $env:TEMP ('cyberstudy-auth-' + [guid]::NewGuid())
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -WindowStyle Hidden -ArgumentList @(
  '--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9225',
  ('--user-data-dir="' + $authTestProfile + '"'), 'about:blank'
)
npm run test:browser
```

Use only an isolated test browser: tests intentionally edit its local Profile and
Settings. Each script opens and closes its own tab. All API calls are intercepted
by fixtures; no development database or Gemini requests occur. The suite includes
auth flows, account switching, 401s, pending guards, keyboard submission, responsive
Login/Register at 390/768/1440 pixels, the existing application route/modal audit,
Dashboard totals/failure recovery and Profile editing/persistence/error handling.
Screenshots are written under ignored `node_modules/.tmp` (the modal screenshot uses
the OS temporary directory). Stop the test browser and preview afterward.

Continuation verification (2026-10-01): Node suite 83 passed, 0 failed, 1 optional
live test skipped. All four browser scripts passed: 12 auth scenario groups,
39 route/viewport checks plus redirects/modal behavior, Dashboard regression and
Profile regression. Backend suite 99 passed, production build and ESLint passed.
Browser verification uses
mocked API responses; real browser-to-backend cookie integration remains a separate
deployment/configuration check. The current backend suite includes the
authentication rate-limiter coverage.

## Remaining work

Development-data migration and legacy ownership claiming are complete. The
development database is now real user data; do not redirect automated tests to it.

Before public deployment, separately verify real cookie/CORS behavior over the
intended same-site HTTPS topology, production secrets, database backup/recovery,
login/register rate limiting and operational security. These are outside this task;
OAuth, reset/verification email, MFA, admin and account deletion were not added.
