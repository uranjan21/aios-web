# System design

How Control Tower is put together and why. Conventions for changing each side
live in `backend/CLAUDE.md` and `frontend/CLAUDE.md`.

## Shape

One container. The FastAPI process serves both the JSON API and the compiled
single-page app, backed by Postgres and Redis.

```
                    ┌──────────────────────────────────────┐
   browser ────────▶│  Container                           │
   (https)          │                                      │
                    │   gunicorn → N uvicorn workers       │
                    │        │                             │
                    │        ├── /api/*   routers          │
                    │        ├── /ws/*    WebSockets        │
                    │        ├── /health  liveness         │
                    │        └── /        the built SPA    │
                    │                                      │
                    │   one worker also runs APScheduler   │
                    └───────┬──────────────────┬───────────┘
                            │                  │
                   Supabase Postgres        Redis
                   (+ pgvector)         (rate limits,
                                      pending tool calls)
```

**Why one container.** The frontend uses a relative `/api` baseURL, dials
WebSockets at `location.host`, and authenticates with a `SameSite=Strict`
cookie. All three depend on the SPA and the API sharing an origin. A VPS
provided that with a reverse proxy beside the app; a PaaS gives one container
one port, so the app serves its own static bundle instead
(`backend/app/core/spa.py`). Split them across hosts and login stops working.

The static mount is registered **last**, after every router, because it matches
`/`. It also refuses to answer anything under `/api/` or `/ws/`: returning the
HTML shell for a missing endpoint would hand the frontend a document where it
expects JSON, and the parse error would surface nowhere near the cause.

## Request flow

1. **`SecurityHeadersMiddleware`** — one CSP for both the document and the API.
   `script-src 'self'` with no `unsafe-inline` (the SPA has no inline script);
   `style-src` allows inline for styled-components and `fonts.googleapis.com`;
   `font-src` allows `fonts.gstatic.com`. Drop either font host and the whole
   type system silently falls back to system UI.
2. **`RequestLoggingMiddleware`** — attaches an `X-Request-ID` and logs method,
   path, status and duration as structured JSON.
3. **CORS** — a single allowed origin, credentials on.
4. **Rate limiting** — slowapi, counters in Redis so they are shared across
   workers. Per-process counters would mean each worker enforces the limit
   separately and the real limit is N times what was configured.
5. **Routers** — `/api/*`. Most carry a `require_verified` dependency.
6. **SPA** — everything else.

## Authentication

A JWT in an httpOnly, `SameSite=Strict` cookie named `aios_token`. Password
login and Google OAuth both issue it. `Secure` is derived from the
`ALLOWED_ORIGIN` scheme, never from `ENVIRONMENT` — keying it on the environment
makes login fail silently on any deploy not behind TLS.

`token_version` on the user row allows revocation. WebSocket connections
authenticate through the same cookie **before** any frame is accepted, and
mirror the verified-email gate; otherwise the HTTP gate is bypassable over
WebSocket.

## Multi-tenancy

Every user-data table carries `user_id`, and every query filters on the
authenticated user. Cross-tenant access returns **404**, not 403 — a 403 tells
the caller the row exists.

This is asserted, not assumed: `tests/test_isolation.py` and
`test_isolation_extended.py` create two real users and have one attempt to read
and write the other's rows across every surface.

## Background work

APScheduler runs inside the web process, but only in the worker that wins a
Postgres advisory lock. Without that election every autoscaled worker fires
every job — duplicate LLM calls, duplicate push notifications.

Fourteen global jobs cover recurring finance posts, bill reminders, email
ingestion, briefings, anomaly scans, forecasts, Google sync and the automation
tick. On top of those, each active user agent registers its own cron in the
user's timezone.

## AI

Every model call runs on the authenticated user's own provider key, stored
Fernet-encrypted in `user_api_keys`. There is no server-side key and no fallback
to one. That single decision is why the app needs no quota system, no usage
metering and no per-user spend cap, and why public signup is safe to leave open.

Chat streams over `/ws/chat` with a tool loop. The system prompt is split into a
byte-stable static prefix plus a per-turn context block, so provider prefix
caching actually hits. Retrieval uses pgvector over the user's own indexed
content.

## Data

PostgreSQL 15 with pgvector. 73 tables, 83 Alembic migrations on a single head.
Migrations run from the container entrypoint on every boot, and a failure kills
the container rather than serving against a stale schema.

Two schema-wide rules, both with tests that pin them:

- **Every datetime column is `TIMESTAMP WITHOUT TIME ZONE` holding UTC.**
- **Soft delete exists on six financial tables only**, and a soft delete still
  reverses the account balance.

Both are explained in `backend/CLAUDE.md`.

## What is deliberately absent

- **No billing.** No Stripe, no subscriptions, no entitlements, no metering.
- **No server LLM key.** See above.
- **No vault sync in hosted deployments.** It is single-tenant — one shared
  filesystem across all users — so production refuses to start with it enabled
  unless explicitly acknowledged.
- **No public API docs in production.** `/docs`, `/redoc` and `/openapi.json`
  map the entire API surface; they are served only outside production, or when
  `ENABLE_API_DOCS` is set.
