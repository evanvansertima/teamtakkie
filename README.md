# FC Harlingen JO19-2 — Teammanager

Players, matches, trainings, tactics board, live match analysis, calendar,
and reports for a youth football team. See `~/.claude/plans/humming-hopping-otter.md`
for the full infrastructure plan this was built from.

## Structure

- **`backend/`** — AdonisJS (Node/TypeScript) API. SQLite via Lucid ORM,
  session-based auth for the single admin account, one migration per entity
  in the data model.
- **`frontend/`** — Vite + React (TypeScript). Talks to the backend over
  `/api/v1`, same-origin in both dev (Vite proxy) and production (Caddy).
- **`legacy/`** — the original single-file HTML prototype this app is being
  ported from. Reference only — see `legacy/README.md`. Delete once the
  frontend migration is complete.
- **`caddy/`** — reverse proxy + static file serving for production
  (builds the frontend and serves it alongside the API, same origin).
- **`docker-compose.yml`** — two services: `app` (backend) and `caddy`
  (frontend + reverse proxy + automatic HTTPS).

## Local development

Backend:

```
cd backend
cp .env.example .env   # fill in APP_KEY (node ace generate:key), ADMIN_EMAIL, ADMIN_PASSWORD
npm install
node ace migration:run
node ace db:seed        # creates the admin account from .env
npm run dev              # http://localhost:3333
```

Frontend:

```
cd frontend
npm install
npm run dev               # http://localhost:5173, proxies /api to :3333
```

## Production

```
DOMAIN=your-domain.example docker compose up -d --build
```

Requires `backend/.env` to exist on the host with a production `APP_KEY`,
`ADMIN_EMAIL`, and `ADMIN_PASSWORD` before the first run. The SQLite
database persists in the `backend_data` Docker volume.
