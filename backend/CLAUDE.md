> Scope: the **backend only**. Project-wide context is in the repo-root
> `CLAUDE.md`, which always loads too. Frontend rules: `frontend/CLAUDE.md`.

# Backend — Control Tower

Python 3.11 · FastAPI · SQLModel (async SQLAlchemy) · asyncpg · PostgreSQL 15 +
pgvector. Package manager is **uv**.

LLM calls go through the Anthropic and OpenAI SDKs, always on the authenticated
**user's own key** (`services/ai/keys.py`), never a server key.

---

## Layout

```text
backend/
├── app/
│   ├── api/                Route handlers, one module per surface
│   │   └── areas/          finance.py · health.py · career.py
│   ├── services/           Business logic
│   │   ├── agents/         Scheduled agents + APScheduler
│   │   ├── ai/             Provider clients, user key storage
│   │   ├── chat/           Streaming chat, tools, context building
│   │   ├── finance/        Recurring posts, email ingestion, categorisation
│   │   ├── insights/       Briefings, synergy, anomalies
│   │   ├── rag/            Embeddings + retrieval (pgvector)
│   │   └── vault_sync/     Watcher + write guard (self-host only)
│   ├── models/             SQLModel tables — 73 of them
│   ├── core/               config · deps · security · middleware · rate_limit · spa · tokens
│   ├── db/                 engine/session, DATABASE_URL normalisation
│   └── main.py             App factory + lifespan
├── alembic/versions/       83 migrations, single head
├── tests/
├── seed_dummy_data.py
└── Dockerfile · pyproject.toml · uv.lock
```

The `Dockerfile` here builds an API-only image used by `docker-compose.yml` for
local development. **Production is built from the repo-root `Dockerfile`**, which
bundles the SPA into the same image.

---

## Architecture

**Request path.** `main.py` builds the app, attaches middleware
(security headers → request logging → CORS), mounts every router under `/api`,
then mounts the built SPA at `/` **last** so no API route is shadowed.

**Auth.** A JWT in an httpOnly, `SameSite=Strict` cookie named **`aios_token`** —
set in `api/auth.py`, read in `core/deps.py`. The cookie name is not the project
name; the project was renamed and the cookie was not, and renaming it now would
sign out every existing session. Google OAuth is supported alongside password
login. `token_version` on the user allows revocation.

**Cookie `Secure` derives from the `ALLOWED_ORIGIN` scheme**, never from
`ENVIRONMENT`. Keying it on the environment makes login fail *silently* on any
production deploy not behind TLS: the server returns 200 with a valid
`Set-Cookie`, the browser refuses to send it over http, and every later request
is anonymous with nothing in the logs.

**WebSockets.** `/ws/chat`, `/ws/agents`, `/ws/sync`, handled in `api/chat.py`,
`api/agents.py`, `api/sync.py`. Always `ws_auth(websocket)` **before** accepting
frames; close with 1008 on failure. The verified-email gate applied to HTTP
routers must be mirrored here or it is bypassable over WebSocket.

**Scheduler.** APScheduler runs in-process, but only in the worker that wins a
Postgres advisory lock (`acquire_scheduler_leadership`). Without that election
every autoscaled worker fires every agent — duplicate LLM spend and duplicate
push notifications. Fourteen global jobs are registered
(`finance_recurring_post`, `finance_due_tomorrow`, `finance_auto_commit`,
`finance_vault_summary`, `finance_csv_backup`, `agent_action_auto_commit`,
`insights_anomalies`, `insights_weekly_digest`, `insights_briefing`,
`insights_synergy`, `google_sync`, `forecasts_nightly`, `automation_tick`,
`knowledge_pull`) plus one cron per active user agent, each registered inside its
own try/except so a single bad registration cannot block the rest — including
`scheduler.start()` itself.

**Agents.** Seven are seeded per user; four are active by default
(`aios-morning-brief`, `aios-monthly-finance`, `aios-health-coach`,
`aios-vault-extractor`). Agent crons are timezone-aware via `Agent.tz`, which is
propagated from the user's briefing preference. Seeding swallows exceptions —
check `api/agents.py` if a new user has no agents.

---

## Conventions

- **Async everywhere** — database, HTTP and file I/O. One synchronous call in a
  handler blocks the entire event loop.
- **`user_id` on every user-data table**, and every query filters on the
  authenticated user. Cross-tenant access returns **404**, never 403 — a 403
  confirms the row exists.
- **SQLModel tables must import `Field` from `sqlmodel`.** Pydantic's `Field`
  silently drops `primary_key` and the table is created without one.
- **Literal routes before `/{id}` routes**, or `/accounts/summary` is parsed as
  an account id.
- **Secrets via `get_settings()`**, never hardcoded.
- **Never resolve a network resource at import time.** A module-level call that
  reaches out turns a cold cache into a crash on boot — this took the whole
  backend down once. `core/tokens.py` is the pattern: resolve lazily, degrade.

---

## Database

**Every `datetime` column is `TIMESTAMP WITHOUT TIME ZONE` holding UTC**, and
every writer passes a naive `datetime.utcnow()`. There is no tz-aware column
left in the schema. `datetime.now(timezone.utc)` heading for a column is a bug —
asyncpg rejects an aware value against a naive column outright.

`tests/test_timestamps.py` pins this from both ends: a metadata sweep that fails
on any `DateTime(timezone=True)`, and a source guard against aware writes. The
source guard exists because **SQLite launders the mistake** — its DATETIME
ignores `timezone=`, so an aware write comes back naive and every API-level
assertion stays green while production 500s.

**Never write `ALTER COLUMN … TYPE timestamp` without an explicit `USING …`.**
Postgres otherwise converts using whatever `TimeZone` the session happens to
have, and nothing in the row records that it happened.

**Soft delete exists on exactly six tables** (`finance_expenses`,
`finance_income`, `finance_transfers`, `finance_bills`, `finance_loans`,
`finance_investments`). `NULL` = live. Two rules make it correct:

1. **A soft delete still reverses the account balance.** A hidden expense that
   left the balance reduced is a correctness bug. `POST /{id}/restore` re-applies
   the delta with the sign flipped.
2. **Every read filters `deleted_at IS NULL`, including the write paths**, so a
   hidden row cannot be edited or deleted twice — a second delete would reverse
   the balance twice, which is the bug this exists to prevent.

Three places deliberately do **not** filter, and must stay that way:
`delete_account`'s transfer count (a soft-deleted transfer is still a physical
row and the RESTRICT FK still refuses — filtering turns a clear 409 into a 500),
`delete_category`'s uncategorise sweep (or a later restore resurrects a dangling
`category_id`), and `services/finance/backup.py` (an archival dump must not be
the one place a recoverable row stops existing).

**GDPR erasure knows nothing about `deleted_at`** and must stay that way. Soft
delete must never become data retention. Pinned by `tests/test_soft_delete.py`.

**Finance categories are a two-level tree keyed by `kind`** (income and expense
trees are separate). Transactions store `category_id` plus a denormalised
top-level ancestor name, so by-category reports roll up for free. Account is
required on manual expense and income (422 without it).

**`DATABASE_URL` is normalised in `app/db/url.py`** before it reaches the driver.
SQLAlchemy's asyncpg dialect forwards URL query parameters straight to
`asyncpg.connect()`, which has no `sslmode`, no `channel_binding` and no
`application_name`, so a provider's libpq-style URI raises `TypeError` at the
first query. That module translates what it can and detects transaction-mode
poolers. Extend it, don't work around it.

**Migrations.** Single head. Read every autogenerated migration before applying
it — autogenerate proposes dropping tables whose models it cannot see.

---

## Known gotchas

- **`health_logs.entry_type` has a Postgres CHECK constraint** — `gym`, `weight`,
  `food`, `meal`, `water`, `steps`, `body_fat`, `sleep`, `note`. A new type needs
  a migration to update it.
- **`VaultWriteGuard`**: all vault writes go through `is_append_allowed()` /
  `is_read_allowed()`. Build area log paths with `area_log_path(area)` — never
  write a year into a path literal, or every entry after the year rolls over
  appends to the wrong file while the stale path stays on the allowlist and
  nothing raises.
- **`seed_dummy_data.py` is user-scoped and date-relative.** Its wipe is
  `DELETE … WHERE user_id` over an explicit allowlist — never
  `Model.__table__.delete()`, which clears the table for every tenant. Every
  timestamp is `TODAY - n`, because the dashboards filter on today / this week /
  twelve weeks, and absolute-dated fixtures render as an empty product.
- **`.dockerignore` must not exclude `alembic/`** — `entrypoint.sh` runs
  `alembic upgrade head` in the container. Excluding it only appears to work
  locally because compose bind-mounts `./backend` over `/app`.
- **Docker has no `--reload`.** After a Python edit: `docker compose restart
  backend`. After an `.env` change: `docker compose up -d backend`, because
  `restart` does not re-read `env_file`.
- **CI must not set `APP_PASSWORD` / `APP_EMAIL`.** `conftest.py` uses
  `os.environ.setdefault` and `test_auth.py` logs in with `testpass`; setting
  them in the workflow makes the setdefault a no-op and every auth test 401s.

### Open: "today" is the server's local date in ~20 places

Every timestamp is naive UTC, but about twenty call sites still compute the
current day with `date.today()` — the *server's local* date. On a UTC host they
agree, which is why this is latent. On an IST host they differ from 05:30 local
until midnight.

This was found, not theorised: `workout_adherence` compared a `date.today()`
window against a naive-UTC `created_at`, so a routine created yesterday looked
three days old. That site is fixed; the rest are deliberately **not**.

The correct boundary for anything a human experiences as a day is the **user's**
timezone, which already exists as `BriefingPreference.tz` and already drives
agent crons. The real fix is a `user_today(user)` helper applied to the
human-facing sites, keeping UTC only where the comparison is against a stored
instant. Mechanically swapping all twenty to `utcnow()` would move every user's
day boundary to UTC midnight — 05:30 for an IST user — which is a worse bug than
the one being fixed. Left as one coherent piece of work rather than a sweep.

---

## Commands

```bash
cd backend
uv sync --extra dev
uv run uvicorn app.main:app --reload --port 8000
uv run pytest                                     # 362 tests
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "..."   # then READ the diff
python seed_dummy_data.py --email you@example.com
```
