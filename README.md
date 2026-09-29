# CyberStudy OS

A cybersecurity-focused learning and productivity workstation designed to bring study tracking, hands-on practice, networking tools, CTF progress, planning, and AI-assisted learning into one workspace.

Cybersecurity study often spans courses, lab platforms, personal notes, and separate task lists. CyberStudy OS brings those records together so a learner can see what they are working on, plan their next session, and connect practical work with the concepts they are learning. V1 focuses on a local, single-user workstation.

## Screenshots

The V1 screenshot set shows the existing application modules.

| View | Screenshot |
| --- | --- |
| Dashboard | ![Dashboard with learning progress, tasks, CTF statistics, and study schedule](docs/screenshots/dashboard.png) |
| My Learning | ![My Learning course cards and topic completion progress](docs/screenshots/learning.png) |
| CTF Tracker | ![CTF Tracker challenge statistics and platform filters](docs/screenshots/ctf-tracker.png) |
| Networking Toolkit | ![Networking Toolkit IPv4 subnet calculator and results](docs/screenshots/networking.png) |
| AI Study Assistant | ![AI Study Assistant conversation and optional study context selector](docs/screenshots/ai-assistant.png) |
| Tasks | ![Tasks summary, priority filters, and study task list](docs/screenshots/tasks.png) |
| Study Planner | ![Study Planner session summaries and daily schedule](docs/screenshots/study-planner.png) |

See the [screenshot checklist](docs/screenshots/README.md) for the corresponding routes.

## Core Features

### Learning and practical work

- **Dashboard** (`/dashboard`): an overview aggregated from existing course, task, CTF, study-session, project, and certification APIs. Includes learning/task/CTF/study summaries, today's study plan, priority tasks, and recent activity derived from stored records. Study time represents scheduled session duration, not a running timer.
- **My Learning** (`/learning`): create courses with planned topic counts, add topics in course detail pages, and mark topics complete. Course progress is recalculated from topic completion.
- **Labs** (`/labs`): record cybersecurity and networking labs with platform, category, difficulty, notes, and links. Track progress through Not Started, In Progress, and Completed statuses.
- **Notes** (`/notes`): create and edit study notes, organize them with categories and tags, search, and pin useful notes.
- **Projects** (`/projects`): track technical projects with status, percentage progress, technologies, and repository/project links.
- **Certifications** (`/certifications`): track planned, in-progress, earned, and expired certifications, with issuer, credential details, issue/expiry dates, and notes.

### Reference and networking

- **Cyber Reference** (`/cyber-reference`): searchable, categorized cybersecurity and networking reference entries bundled with the frontend.
- **Linux Commands** (`/linux`): searchable command categories, syntax, examples, and command detail views.
- **Networking Toolkit** (`/networking`): IPv4 subnet calculation with CIDR, subnet/wildcard masks, network/broadcast addresses, host ranges, address counts, and binary views. Also includes an expandable OSI model explorer, TCP/IP mapping, IPv4 ranges, CIDR tables, and networking quick reference.

### Practice and planning

- **CTF Tracker** (`/ctf`): create and edit challenges, filter by platform/category/difficulty/status, record hints and notes, and mark whether a flag was captured. Statistics include completion, captured flags, and points from completed challenges. Flag capture is a boolean record; the app does not validate flag submissions.
- Platform choices include TryHackMe, Hack The Box, picoCTF, OverTheWire, PortSwigger Web Security Academy, CyberDefenders, LetsDefend, Root Me, and VulnHub, plus custom names. These are manually maintained records, not external platform integrations.
- **Tasks** (`/tasks`): manage task category, priority, status, optional due dates, overdue visibility, and completion timestamps.
- **Study Planner** (`/planner`): schedule sessions with start/end times and duration, use Today/Week/Upcoming views, and mark sessions Planned, Completed, or Skipped. Weekly duration includes scheduled time across all statuses.

### AI-assisted learning

- **AI Study Assistant** (`/ai`): Gemini-backed chat through FastAPI for cybersecurity, networking, Linux, programming, and related study questions.
- Optionally include bounded snapshots from My Learning, Labs, Notes, Projects, Certifications, or CTF Progress. No application context is selected by default.
- Recent conversation turns provide follow-up context. Chat history stays in browser memory and clears when the user leaves the page or reloads it.

### Local learner profile

- **Profile** (`/profile`): a local learner profile with display name, headline, organization, current focus, bio, skill tags, and learning goals. Changes persist only after **Save Profile**, in one JSON object under `cyberstudy.profile` in this browser's localStorage. **Clear Profile** requires confirmation and removes only that key; Settings and study records remain untouched. This is not an authenticated account, has no cloud synchronization, and is not included in Gemini context.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, and Lucide React.
- **Backend:** Python, FastAPI, Uvicorn, SQLAlchemy, Pydantic, pydantic-settings, and Alembic.
- **Database:** PostgreSQL through the Psycopg driver.
- **AI:** Google Gemini API through the backend's `google-genai` SDK.
- **Testing:** Node's built-in test runner and assertions for frontend utilities/API contracts; Python `unittest`, FastAPI `TestClient`, mocks, and PostgreSQL integration tests for the backend. Optional browser smoke scripts use Chrome's DevTools Protocol.

Dependency versions are maintained in [frontend/package.json](frontend/package.json), [frontend/package-lock.json](frontend/package-lock.json), and the backend [runtime](backend/requirements.txt) and [development](backend/requirements-dev.txt) requirements files.

## Architecture

```text
React frontend
      |
      | HTTP / JSON
      v
FastAPI backend
      |
      +---- PostgreSQL
      |
      +---- Gemini API
```

FastAPI is the application/API layer: it validates requests, handles database operations, and prepares AI requests. The browser never connects directly to PostgreSQL. The Gemini API key is loaded only on the backend. Reference datasets and the IPv4 calculator run in the frontend; dashboard summaries are derived from the existing module APIs.

## Project Structure

```text
CyberStudyOS/
├── frontend/
│   ├── src/
│   │   ├── components/       # Forms, cards, navigation, and chat UI
│   │   ├── pages/            # Application modules
│   │   ├── layouts/          # Shared application shell
│   │   ├── services/         # HTTP API clients
│   │   ├── data/             # Reference datasets and shared types
│   │   ├── constants/
│   │   └── utils/            # Calculations, filtering, and summaries
│   ├── tests/
│   ├── .env.example
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── alembic/versions/
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── run_local.py
├── docs/screenshots/         # Complete V1 screenshot set
└── README.md
```

## Prerequisites

- Git to clone the repository.
- Node.js and npm compatible with the locked dependencies. The lockfile specifies Node `^20.19.0 || >=22.12.0` for Vite and `^20.19.0 || ^22.13.0 || >=24` for ESLint; choose a runtime satisfying both.
- Python with `venv` and `pip`, compatible with the pinned backend dependencies. The project does not declare a single Python runtime version.
- A running PostgreSQL server, a database, and a login with permission to create the application's tables through Alembic. No PostgreSQL major version is pinned.
- A Gemini API key with access to the model configured in `backend/app/config.py`, if AI chat is needed. Other modules can run without a Gemini key.

## Installation

The commands below use PowerShell. Start in the repository root unless a step changes directories. They describe a fresh installation; keep existing environment files and databases when updating an existing checkout.

### 1. Clone the repository

Replace `REPOSITORY_URL` with this project's clone URL. No remote URL is configured in the current local repository.

```powershell
git clone REPOSITORY_URL CyberStudyOS
cd CyberStudyOS
```

### 2. Install frontend dependencies

```powershell
cd frontend
npm ci
cd ..
```

### 3. Create the backend environment and install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

Explicit interpreter paths avoid requiring PowerShell activation. On macOS/Linux, use `python3 -m venv .venv` and `.venv/bin/python` for the corresponding backend commands.

### 4. Prepare PostgreSQL

Start your PostgreSQL service. Using your PostgreSQL administration tool, create an empty database named `cyberstudy` (or another name of your choice) and a login that owns it and can create tables. This project does not provision PostgreSQL or include a database creation script.

Use that database and login in `DATABASE_URL`. The schema is created by the existing Alembic migrations in step 6, not by application startup. Do not point a fresh installation at an unrelated database.

### 5. Configure environment files

For a new checkout, copy the supplied examples:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Edit `backend/.env` with your own database connection and optional Gemini key. The frontend example points to the local API and usually needs no changes. See [Environment Variables](#environment-variables) below. Do not overwrite an existing `.env` containing your configuration.

### 6. Apply existing migrations

```powershell
cd backend
.\.venv\Scripts\python.exe -m alembic upgrade head
cd ..
```

For an existing database, read [Database Migrations](#database-migrations) first. There is no automatic seed step; create your own records through the application.

### 7. Start the application

Run the backend and frontend in separate terminals using [Running CyberStudy OS](#running-cyberstudy-os).

## Environment Variables

The examples are [backend/.env.example](backend/.env.example) and [frontend/.env.example](frontend/.env.example). Real `.env` files must not be committed.

| Variable | Location | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Backend | Required SQLAlchemy PostgreSQL URL using `postgresql+psycopg://USER:PASSWORD@localhost:5432/cyberstudy`; all credentials shown here are placeholders. Percent-encode special characters in URL credentials. |
| `GEMINI_API_KEY` | Backend | Optional for startup; required for AI replies. The example leaves this blank. |
| `CORS_ORIGINS` | Backend | JSON array of allowed browser origins. The example includes localhost and 127.0.0.1 on ports 5173 and 4173. |
| `VITE_API_BASE_URL` | Frontend | Public API base URL, defaulting to `http://127.0.0.1:8000`. It must contain no secrets. |

Backend settings read `backend/.env`; process environment variables take precedence. Restart the backend after changing them. Restart Vite after frontend environment changes, or rebuild for production output. `VITE_*` values are exposed to the browser. The Gemini model is a code constant in `backend/app/config.py`, not an environment variable in the current example.

## Database Migrations

From `backend`, apply the existing migration chain and inspect the installed revision:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m alembic current
```

The migrations cover courses, topics, labs, notes, projects, certifications, CTF challenges, tasks, and study sessions. Alembic reads `DATABASE_URL` through the backend settings; credentials do not belong in `alembic.ini`.

Back up valuable data before applying pending migrations. A pre-existing database without Alembic tracking requires schema inspection before adoption; do not blindly stamp it or run the initial table-creation migration against existing tables. See [the migration guide](backend/alembic/README.md) for the original baseline adoption and migration workflow. Application startup does not create or modify tables.

## Running CyberStudy OS

**Backend — terminal 1, from the repository root:**

```powershell
cd backend
.\.venv\Scripts\python.exe run_local.py
```

This entrypoint binds FastAPI to `127.0.0.1:8000`. For development with reload, use `.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload` from `backend` instead.

**Frontend — terminal 2, from the repository root:**

```powershell
cd frontend
npm run dev
```

- Frontend: `http://localhost:5173` by default; `/` redirects to `/dashboard`.
- FastAPI Swagger UI: `http://127.0.0.1:8000/docs`.
- API health: `http://127.0.0.1:8000/api/health`.

Vite prints its actual URL and may choose another port if 5173 is occupied. If the browser origin changes, update `CORS_ORIGINS` to match and restart the backend.

## AI Assistant & API Key Security

The request flow is **React → FastAPI → Gemini**. The browser submits the message, recent chat history, and selected context-source names to `POST /api/ai/chat`. FastAPI loads the Gemini key from backend environment configuration and calls the SDK. Never place that key in frontend code or a `VITE_*` variable.

Context selection is optional. When selected, the backend reads limited fields and bounded records from the chosen modules and sends those snapshots to Gemini with the prompt. Notes may include content excerpts. With no context selected, no application records are included. Tasks and Study Planner are not current AI context sources. Conversations are not persisted by the backend.

See [the AI guide](backend/AI.md) for request structure, context limits, errors, and mocked tests.

## Testing

**Frontend — from `frontend`:**

```powershell
node --test tests/*.test.mjs
npm run build
npm run lint
```

The test command runs the existing Node test files; there is no `npm test` script. The production build runs TypeScript checking followed by Vite and writes `frontend/dist`. `npm run preview` serves that build locally, normally on port 4173.

In restricted environments where child-process spawning fails with `EPERM`, the following alternatives have been verified for this checkout:

```powershell
node --test --test-isolation=none tests/*.test.mjs
npm run build -- --configLoader native
```

Optional browser smoke scripts in `frontend/tests/*.browser.mjs` require running servers and a separately started Chrome debugging instance. Their file headers specify the ports; they are not part of the unit-test command. Module-specific manual checks also live in `frontend/tests/`.

**Backend — from `backend`:**

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
Copy-Item .env.test.example .env.test
# Fill TEST_DATABASE_URL with credentials for a separate database ending in _test.
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Database integration tests require `TEST_DATABASE_URL`, supplied through the process environment or ignored `backend/.env.test`. They never fall back to `DATABASE_URL`. The guard requires a PostgreSQL database name ending in `_test`, rejects the development database name and URL query overrides, and verifies the actual connected database before test writes. See [isolated backend testing](backend/TESTING.md) to create the separate database and apply existing migrations to it. Test records are rolled back; only test-database sequences may advance. AI tests mock Gemini and make no real generation calls. A focused AI HTTP test run is:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p test_ai.py -v
```

## API Documentation

With the backend running, open Swagger UI at `http://127.0.0.1:8000/docs`. The OpenAPI document is served at `http://127.0.0.1:8000/openapi.json`.

The API exposes the database-backed learning, lab, note, project, certification, CTF, task, and study-session modules, plus AI chat. Swagger shows supported operations, request schemas, and response models. `/api/health` checks application availability; `/api/db-health` checks database connectivity. Using Swagger's AI chat operation makes a real Gemini request when configured.

## V1 Scope

V1 is a local, single-user learning workstation. It has no authentication or separate user accounts; keep the API local rather than exposing it as a public service. The repository does not include a cloud deployment setup.

Task and study-session records are separate, with no external calendar synchronization or reminder engine. Chat history is page-session-only. Settings preferences and the learner Profile are functional and stored separately in this browser (`cyberstudy.settings` and `cyberstudy.profile`). Global search, notifications, and the streak indicator are marked as coming soon. These define the current scope and are not advertised as working features.

## Roadmap

Potential future directions, not current functionality:

- Authentication and user accounts.
- Linking tasks with study sessions and optional AI-assisted planning.
- Persistent AI conversation history.
- Reminders and notifications.
- Deployment support and additional networking/security tools.

## Author

**M. Dhayalan**  
BICT Undergraduate  
South Eastern University of Sri Lanka

## License

CyberStudy OS is licensed under the [MIT License](LICENSE).
