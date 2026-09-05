# Control Tower

A personal life-management app: **finance**, **health** and **career** in one
place, with an AI assistant that can read and write your data, scheduled agents
that produce daily briefs, and optional Google/Notion integrations.

Multi-tenant — every row is scoped to a user — and **free, bring-your-own-key**.
There is no billing, no subscription and no usage metering. Each user pastes
their own OpenAI or Anthropic key into Settings; it is encrypted at rest and
their provider bills them directly. The server never calls an LLM on its own
account, which is what makes public signup safe to leave open.

## Stack

| | |
|---|---|
| Frontend | React 18 · TypeScript · Vite · styled-components · `@ledgr/ui` |
| Backend | Python 3.11 · FastAPI · SQLModel · async SQLAlchemy + asyncpg |
| Database | PostgreSQL 15 + pgvector (Supabase in production) |
| Realtime | FastAPI WebSockets — `/ws/chat`, `/ws/agents`, `/ws/sync` |
| Jobs | APScheduler, single leader elected via a Postgres advisory lock |
| Cache | Redis — rate-limit counters, pending tool calls |

The frontend is a pnpm workspace under `frontend/`; the backend is a `uv`
project under `backend/`. They deploy as **one container**: the API process
serves the compiled SPA, so both share an origin.

## Run it locally

Requires Docker, [uv](https://docs.astral.sh/uv/) and
[pnpm](https://pnpm.io/).

```bash
cp .env.example .env          # then fill in APP_SECRET_KEY at minimum
./run.sh                      # Postgres in Docker, backend :8000, frontend :5173
```

`run.sh` starts the database container, applies migrations, and runs the API and
the Vite dev server on the host. Open http://localhost:5173.

To run the backend in Docker instead:

```bash
docker compose up -d          # Postgres + Redis + backend on :8000
cd frontend && pnpm dev       # frontend still runs on the host
```

## Tests

```bash
cd backend  && uv sync --frozen --extra dev && uv run --no-sync pytest   # 362 tests
cd frontend && pnpm exec vitest --run                                    # 81 tests
cd frontend && pnpm typecheck && pnpm lint && node scripts/token-lint.mjs
```

Both sides install from a committed lockfile — `uv.lock` and `pnpm-lock.yaml` —
in CI and in the production image alike, so what ships is what was tested.

CI runs all of the above, then builds the deployable image and boots it against
a real pgvector database to prove migrations apply and both surfaces serve.

## Deploy

One Docker image on a PaaS, with Supabase as the database.
**[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** is the walkthrough; `render.yaml`
and `fly.toml` are ready to use.

## Documentation

| File | What it covers |
|---|---|
| [SYSTEM_DESIGN.md](SYSTEM_DESIGN.md) | Architecture, request flow, data model, auth |
| [FEATURES.md](FEATURES.md) | What the app actually does today |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Supabase + PaaS, step by step |
| [docs/PRODUCTION_RUNBOOK.md](docs/PRODUCTION_RUNBOOK.md) | Operating it once it is live |
| [docs/PRODUCT_ROADMAP.md](docs/PRODUCT_ROADMAP.md) | Known gaps and what is next |
| [CLAUDE.md](CLAUDE.md) · [AGENTS.md](AGENTS.md) | Conventions for AI coding tools and contributors |

## Licence

[GNU AGPL v3.0](LICENSE). You may use, modify and redistribute this, but if you
run a modified version as a network service, you must make your source available
to its users. That last clause is the point of choosing AGPL over MIT: it keeps
a hosted fork open rather than letting it close.

Copyright © 2026 Utsav Ranjan.
