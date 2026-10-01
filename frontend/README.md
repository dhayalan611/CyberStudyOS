# CyberStudy OS frontend

React and TypeScript application built with Vite, Tailwind CSS, React Router, and Lucide React.

See the [root README](../README.md) for features, PostgreSQL/backend setup, environment variables, and V1 scope.

Run these commands from `frontend`:

```powershell
npm ci
npm run dev
```

For a fresh checkout, copy `.env.example` to `.env` only if you need an explicit frontend configuration. Without an override, the local API URL follows the browser hostname on port 8000 (`localhost` stays with `localhost`; `127.0.0.1` stays with `127.0.0.1`) so SameSite auth cookies work. If `VITE_API_BASE_URL` is set, use the same hostname as the frontend. Frontend environment variables are public; never put a Gemini key or database credentials here.

## Checks and production build

```powershell
node --test tests/*.test.mjs
npm run lint
npm run build
npm run preview
```

`build` runs TypeScript checking and produces `dist/`. `preview` serves that output locally. There is no `npm test` script. See the root README's [testing section](../README.md#testing) for sandbox alternatives and backend tests.

The `tests/` directory also contains manual verification guides and optional browser smoke scripts whose headers describe their server/debugging prerequisites.
