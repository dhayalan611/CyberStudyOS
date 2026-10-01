# V2 authentication foundation

Step 2B protects all implemented private resource APIs and AI chat with cookie
authentication and user ownership checks; see [OWNERSHIP.md](OWNERSHIP.md).
Frontend authentication is implemented. Public deployment still requires
shared rate-limit state and other operational hardening.

## Configuration

Install `requirements-dev.txt` in the backend virtual environment. In ignored
`backend/.env`, set:

| Variable | Behavior |
| --- | --- |
| `AUTH_SECRET` | Required random secret of at least 32 bytes, backend only. Missing, short, and example-placeholder values fail startup. |
| `AUTH_COOKIE_SECURE` | Defaults to `true`. Set `false` only for local HTTP development; production requires HTTPS and `true`. |
| `AUTH_TOKEN_MINUTES` | JWT and cookie lifetime in minutes; default 30, allowed 1–1440. |
| `AUTH_LOGIN_RATE_LIMIT` | Login attempts per direct client IP in the window; default 10. |
| `AUTH_REGISTER_RATE_LIMIT` | Registration attempts per direct client IP in the window; default 5. |
| `AUTH_RATE_LIMIT_WINDOW_SECONDS` | Sliding-window length; default 60 seconds. |
| `CORS_ORIGINS` | JSON array of exact trusted frontend origins (scheme, host, port; no trailing slash). Wildcard and `null` origins are rejected. |

Generate the development secret directly into the ignored file without printing
it. From `backend`, this preserves an existing configured secret:

```powershell
@'
from pathlib import Path
from secrets import token_urlsafe
from dotenv import dotenv_values
p = Path('.env')
if not dotenv_values(p).get('AUTH_SECRET'):
    with p.open('a', encoding='utf-8') as f:
        f.write('\nAUTH_SECRET=' + token_urlsafe(48) + '\n')
'@ | .\.venv\Scripts\python.exe -B -
```

Never put the secret in frontend environment variables, source code, or logs.
Changing the secret invalidates all previously issued tokens.

## Endpoints

All request bodies are JSON. Every auth POST requires an `Origin` header exactly
matching `CORS_ORIGINS`, including command-line clients and Swagger calls. Add the
API's own origin explicitly if using its Swagger UI. Missing/untrusted origins
receive 403. These checks also prevent login/logout CSRF; CORS alone is insufficient.

| Endpoint | Request | Success |
| --- | --- | --- |
| `POST /api/auth/register` | `username`, `email`, `password` | 201, public user; does not log in |
| `POST /api/auth/login` | `username`, `password` | 200, public user and authentication cookie |
| `POST /api/auth/logout` | No body | 204, clears cookie; idempotent |
| `GET /api/auth/me` | Authentication cookie | 200, current public user |

Public users contain only `id`, `username`, `email`, `created_at`, and `updated_at`.
Duplicate username/email returns 409; invalid credentials or missing/invalid/
expired authentication returns 401; invalid input returns 422 without echoing
submitted values. All auth responses use `Cache-Control: no-store`.

Usernames are trimmed, lowercased, and limited to 3–32 ASCII letters, digits, or
underscores. Emails are validated and stored lowercase, so account uniqueness is
case-insensitive through normalized writes and database unique indexes. Passwords
are 12–128 characters at registration, preserved exactly without trimming or
complexity rules, and stored only as Argon2id hashes through `pwdlib`.

## Cookie and token behavior

PyJWT signs HS256 tokens with `sub` (user ID), `iat`, and `exp`. Verification pins
HS256, requires all three claims, verifies signature/expiration, bounds the user
ID, and loads the user from PostgreSQL. `app.auth.get_current_user` is the reusable
dependency used by `/api/auth/me` and the `CurrentUser` dependency on private
resource APIs. `CurrentUser` also requires an exact trusted Origin on POST, PUT,
PATCH, and DELETE requests. Unsupported methods remain unavailable.

The host-only `cyberstudy_session` cookie has `Path=/`, `HttpOnly`, `SameSite=Lax`,
and a maximum age equal to the token lifetime. `Secure` defaults on. Tokens are
never returned in JSON and must not be stored in localStorage. Future React calls
must use `credentials: 'include'`; credentialed CORS is enabled for exact trusted
origins. Use the same hostname on frontend/backend locally (both `localhost`, or
both `127.0.0.1`). Production should use a same-site HTTPS frontend/API setup;
cross-site cookies are outside this foundation.

Logout clears this browser's cookie. JWTs are stateless: a copied token remains
valid until expiration, and there is no server-side revocation or refresh flow.
Do not claim immediate revocation across devices. Public deployment will also
require the rate-limit configuration below.

Authentication login and registration are limited in memory per direct client
socket address. Successful and failed attempts both consume a slot, and a
generic 429 response includes `Retry-After`. The limiter does not trust
`X-Forwarded-For`; a reverse proxy must be deliberately configured and a
multi-instance deployment should replace this process-local limiter with a
shared store such as Redis.

## Database and verification

Migration `0009_create_users` extends V1 head `cbfc69511070`. It adds only `users`:
integer primary key, unique indexed username (32) and email (254), password hash
(255), and timezone-aware creation/update timestamps using the existing timestamp
conventions. Downgrade drops only the new table and its indexes, losing accounts.

Use the guarded migration command and full test command in [TESTING.md](TESTING.md).
Only `cyberstudy_test` was migrated for this task; apply migrations to development
deliberately when ready to use these endpoints there. Never redirect integration
tests to development. Tests roll back records and mock Gemini.

The ownership schema and local claim process are documented in [OWNERSHIP.md](OWNERSHIP.md).
Ownership filters, authenticated creates, nested-resource checks, and AI-context
isolation are verified by the backend suite. The next phase implements frontend
authentication and clears private UI state on logout/account changes.

Library references: [FastAPI password hashing and JWT](https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/)
and [PyJWT claim validation](https://pyjwt.readthedocs.io/en/latest/usage.html).
