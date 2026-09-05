# CLAUDE.md — Control Tower

Project-level context: what this is, how it is put together, and the rules that
span both sides of the stack. Read `AGENTS.md` too — it is the short working
agreement for anyone (human or AI) changing this repo.

Domain rules live beside the code they govern. Read the matching file **before**
writing code on that side:

| File | Covers | Read when |
|---|---|---|
| `CLAUDE.md` (this file) | Product, stack, structure, cross-cutting rules | Always |
| `backend/CLAUDE.md` | FastAPI/SQLModel conventions, migrations, isolation | Touching `backend/` |
| `frontend/CLAUDE.md` | Design system, module kit, React conventions | Touching `frontend/` |
| `SYSTEM_DESIGN.md` | Architecture and request flow | Changing how pieces fit |
| `docs/DEPLOYMENT.md` | Supabase + PaaS deployment | Touching Docker, CI, or env |

Do not copy a rule upward into this file. Extend the file that owns it.

---

## What this is

A personal life-management app covering **finance**, **health** and **career**,
with an AI assistant, scheduled agents, and optional Google/Notion integrations.

Two facts shape almost every decision below.

**It is multi-tenant.** Every user-data table carries `user_id`, and every query
filters on it. This is not aspirational — `backend/tests/test_isolation.py` and
`test_isolation_extended.py` assert it by having one user attempt to read
another's rows.

**It is free, bring-your-own-key.** There is no billing, no subscription, no
entitlement gating and no AI usage metering; the tables that backed them were
dropped. Each user's own provider key is stored Fernet-encrypted in
`user_api_keys` and every LLM call runs on it.

> There is deliberately **no instance-level LLM API key fallback.** Adding one
> means any signup can spend the operator's money without limit, which is
> precisely the liability that forced the quota, credit and metering machinery
> this project spent months building and then deleting. If you find yourself
> adding `OPENAI_API_KEY` to the server config, stop.

Business and Content were once areas of the app and were removed in July 2026.
Their tables were deliberately kept so historical rows still render;
`frontend/packages/shared/src/config/domains.ts` separates ACTIVE from RETIRED
domain keys.

---

## Repository layout

```text
.
├── backend/                  FastAPI service (uv)
│   ├── app/
│   │   ├── api/              Routers — one per surface, areas/ for the 3 domains
│   │   ├── core/             config, deps, security, middleware, rate limit, spa
│   │   ├── db/               engine/session, DATABASE_URL normalization
│   │   ├── models/           SQLModel tables (73 of them)
│   │   └── services/         Business logic — agents, chat, finance, rag, …
│   ├── alembic/versions/     83 migrations, single head
│   └── tests/
├── frontend/                 pnpm workspace root
│   ├── apps/shell/           THE deployable Vite app: router, nav, cross-domain pages
│   ├── apps/{finance,health,career}/   One package per life area
│   └── packages/
│       ├── shared/           @ct/shared — api, stores, hooks, lib, theme, types
│       └── ui/               @ledgr/ui — the component library (tsup → dist/)
├── Dockerfile                The ONE deployable image: SPA + API together
├── docker-compose.yml        Local development only
├── render.yaml · fly.toml    PaaS deployment
└── docs/
```

---

## How it deploys

**One container.** The API process serves the compiled SPA from `/app/static`
(`backend/app/core/spa.py`), so the frontend and the API share an origin. The
database is Supabase; Redis comes from the platform.

That single origin is a hard requirement, not a simplification:

- `frontend/packages/shared/src/api/client.ts` uses a relative `/api` baseURL —
  there is no absolute API URL anywhere in the frontend.
- The WebSocket hooks dial `location.host`.
- The auth cookie is `SameSite=Strict`.

Any topology that splits the SPA and the API across hosts (a CDN for the
frontend, say) breaks login and WebSockets. Before changing anything about how
the app is served, read `docs/DEPLOYMENT.md`.

---

## Cross-cutting rules

Rules that belong to one side live in that side's `CLAUDE.md`. These span both.

**Verify against reality, not against the source.** The most expensive bugs in
this repo's history were things that read correctly and behaved differently:
a config value the container never received, a route that returned HTML where
JSON was expected, a component whose stale build was still being served. Run it,
measure it, curl it.

**`ALLOWED_ORIGIN` must exactly match what users type in the browser**, scheme
included. It drives CORS, the CSP `connect-src`, and whether the auth cookie
carries `Secure`. A wrong value does not raise — login just silently fails.

**`VITE_*` variables are build-time.** Vite inlines them into the bundle, so
setting one on a running container does nothing at all. They must be Docker
build args. This is why frontend analytics once shipped inert in every image.

**The auth cookie is named `aios_token`.** Not `ct_token`. The project was
renamed; the cookie never was, and renaming it now would sign out every existing
session.

**Vault sync is single-tenant** — one shared filesystem across all users, not
isolated per user. It must stay off in any hosted deployment. The backend
refuses to start with `VAULT_SYNC_ENABLED=true` in production unless
`VAULT_SINGLE_TENANT_ACK=true`, so leaving it on can only ever be deliberate.

**Compose project names are pinned, not derived.** `docker-compose.yml` declares
`name: control-tower`. Compose otherwise defaults to the containing directory,
so renaming the checkout would silently create a fresh empty `pgdata` volume and
abandon the one holding your data.

**Never commit a real `.env`.** `.gitignore` denies `.env.*` by default and
re-includes only the `*.example` files. The repo is public.

---

## Commands

```bash
./run.sh                                   # db + backend :8000 + frontend :5173

cd backend
uv run pytest                              # 362 tests
uv run alembic upgrade head
uv run alembic revision --autogenerate -m "..."   # then READ the diff

cd frontend
pnpm install                               # also builds @ledgr/ui via `prepare`
pnpm dev                                   # shell dev server :5173
pnpm build                                 # @ledgr/ui, then the shell
pnpm typecheck                             # tsc over the whole workspace
pnpm lint                                  # eslint, ratcheted at 289 warnings
pnpm exec vitest --run                     # 81 tests
node scripts/token-lint.mjs                # design-token drift ratchet
```

Two lint gates are **ratchets**: the number is the current count, so any new
violation fails the build while the existing tail does not. Lower them after a
genuine reduction; never raise them to make your change pass.
