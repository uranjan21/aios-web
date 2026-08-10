> **ALL AI tools (Claude/Codex/Antigravity): read `AGENTS.md` first — the end-of-session PROGRESS.md entry is mandatory.**
> Business context, decisions & sync: Utsav's AI OS vault → `~/Library/Mobile Documents/com~apple~CloudDocs/2. Workspace/AI OS/04-business/products/control-tower/`

# Project: Control Tower

## Where the rules live (restructured 2026-07-28)

This file is the **project-level** source of truth: what the product is, the
stack, deploy topology, cross-cutting gotchas, and the change history. The
domain-specific rules were split out so each side of the stack carries its own
context:

| File | Covers | Loads when |
|---|---|---|
| `CLAUDE.md` (this file) | Product, stack, deploy, history, backlog | **Always** |
| `frontend/CLAUDE.md` | Design system, UI/UX rules, monorepo graph, React conventions | Working under `frontend/` |
| `backend/CLAUDE.md` | FastAPI/SQLModel conventions, migrations, multi-tenancy, backend gotchas | Working under `backend/` |
| `AGENTS.md` | The working agreement for every AI tool (mandatory session log) | Always |

Skills live beside the code they serve — e.g. `frontend/.claude/skills/`.

**Read the matching sub-file before writing code on that side.** Do not
duplicate its rules back into this file; add them where they belong.

---

## What this is

A full-stack personal life-management OS — Finance, Health, Career, Business, Content — with AI agents, vault sync, and multi-LLM integration. **Transitioning from single-user to multi-tenant SaaS (decided 2026-06-21).** All new DB/backend work must be multi-user aware: `users` table, `user_id` FK on every user-data table, row-level isolation.

The frontend is a pnpm-workspace **monorepo** (converted 2026-07-20) rooted at `frontend/`; the backend is a FastAPI service in `backend/`. Details in each sub-file.

---

## Repository layout

```text
Project - Control Tower/            # repo root (git)
├── frontend/                   # pnpm workspace root — apps/* + packages/* + its own CLAUDE.md
├── backend/                    # FastAPI service (uv) — its own CLAUDE.md
├── deploy/                     # VPS ops: deploy.sh, backup-db.sh
├── docs/                       # cross-cutting docs (deployment, runbook, roadmap, pricing, audits)
├── .github/workflows/          # ci.yml + deploy.yml (GitHub requires this path)
├── docker-compose.yml          # local dev (project name pinned to `control-tower`)
├── docker-compose.prod.yml     # VPS stack (project `control-tower-prod`)
├── CLAUDE.md · AGENTS.md · PROGRESS.md · FEATURES.md · SYSTEM_DESIGN.md
├── run.sh                      # one-shot local dev: db → migrations → backend + shell
└── .env · .env.example · .env.prod.example
```

Before 2026-07-28 the JS workspace lived at the repo root. Anything referencing
`apps/…` or `packages/…` from the root — Dockerfile contexts, CI working
directories, `run.sh`, `backend/tests/test_api_mappings.py` — now goes through
`frontend/`.

---

## 📍 Progress Snapshot (auto-synced)

**Last synced:** 2026-07-14

**Shipped (durable state):**
- Security: 3 rounds of multi-tenancy/IDOR audits + full 9-domain backend audit (2026-06-30, Opus-verified 07-01) + workspace audit (07-07) — all CRITICAL/HIGH fixed; isolation verified by live cross-tenant attack. Open backlog lives in memory `project_backend_audit.md`.
- Billing: modular pay-per-module ($5/module, $29 bundle, metered AI) code-complete; OFF until live-Stripe test-mode verification.
- Design: "Premium Black + Gold" @ledgr/ui system app-wide; Dialog has icon/eyebrow/stepper/DialogFooter; PageHeader subtitle below title.
- Areas: Content = 6-tab CMS; Business = Portfolio Hub; Dashboard 2.0 = BriefingCard + PulseRow + DiscoveriesFeed + LifeHeatmap (left column) + calendar (right column); GreetingHero quote refresh/save + "Quick Log" ⌘L.
- **Workspace (Projects/Sprints/Tasks/Goals):** alembic head `w004_add_quote_favorite`. All 3 pages have domain AreaTabs + shared `CollapsibleSection`; server enforces goal↔domain match, task inherits project domain/sprint project, delete_goal unlinks children; edit dialogs send explicit `null` to clear fields (Payload types in api/workspace.ts).
- Tests: Docker suite 132 passing (+ 2 env-only failures that pass on host); e2e 82/82; `tsc`/`pnpm build` clean.

**Key gotchas (memory `project_aios_web.md` has the full list):** SQLModel tables must use sqlmodel's `Field` (pydantic's silently drops `primary_key`); FastAPI literal routes before `/{id}` param routes; ledgr-ui rebuild needs full reinstall + Vite restart; `test_auth`/`test_api_mappings` host-only (`cd backend && uv run pytest`); signup agent-seeding swallows exceptions — check `api/agents.py` if new users lack the 8 default agents.

**Next up** (see `docs/PRODUCT_ROADMAP.md` + memory index):
- Verify Stripe billing end-to-end with test-mode keys; drop legacy `plan`/`addons` columns once verified; decide `require_module` gating for goals/forecasts/insights/actions/automations routers.
- Backend deferred items in priority order: BILL-2 (DB-backed webhook idempotency) → AUTH-1 (proxy IP at deploy layer) → ADMIN-2 (delete-user audit log) → BILL-3 → HLT-2 (user timezone) → SYNC-1/2 (async vault I/O).
- Content CMS metrics are still manual-entry only.

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite + **@ledgr/ui** (component library at `frontend/packages/ui/`) + styled-components. **No Ant Design** (removed 2026-07-21). **No Highcharts** — Recharts only. → `frontend/CLAUDE.md`
- **Backend**: Python 3.11+ + FastAPI + SQLModel (async SQLAlchemy) + asyncpg → `backend/CLAUDE.md`
- **Database**: PostgreSQL 15 + pgvector
- **AI/LLMs**: Anthropic Claude SDK, OpenAI SDK (default provider, `settings.openai_chat_model`)
- **Real-time**: FastAPI native WebSockets (`/ws/sync`, `/ws/chat`, `/ws/agents`)
- **State**: Zustand (global) + React Query / TanStack (server state)
- **Auth**: JWT in httpOnly SameSite=Strict cookie named **`aios_token`** — not `ct_token`, which this line claimed until 2026-08-03; the rename never touched the cookie, and changing it now would sign out every existing session. Google OAuth added 2026-06-21.
- **Package managers**: pnpm workspaces (frontend — install from `frontend/`), uv (backend)
- **Container**: Docker + docker-compose

---

## Cross-cutting Gotchas

Side-specific gotchas live in `frontend/CLAUDE.md` and `backend/CLAUDE.md`. These
span both:

- **Deployment configs: read `docs/DEPLOYMENT.md` before touching any Dockerfile / compose / CI / env file.** The prod stack is `docker-compose.prod.yml` (project `control-tower-prod`) — Caddy edge + backend + db + redis, with **only** Caddy publishing ports. `docker-compose.yml` is local-dev only and must never run on the VPS.
- **The frontend must stay same-origin with the API.** `frontend/packages/shared/src/api/client.ts` uses a relative `/api` baseURL and the WS hooks use `location.host` — there is no absolute API URL anywhere. Any deploy topology that splits them (separate CDN/host for the SPA) breaks auth and WebSockets.
- **Compose project names are pinned, not derived.** `docker-compose.yml` declares `name: control-tower` and the prod file declares `control-tower-prod`. Compose otherwise defaults the project name to the containing directory — so renaming the repo folder would silently create a fresh empty `pgdata` volume and abandon the existing one. Never remove those `name:` keys.
- **The web image's build context is `frontend/`, not the repo root** (changed 2026-07-28). It is set in three places that must agree: `docker-compose.yml` (`context: ./frontend`), `.github/workflows/deploy.yml` (`context: ./frontend`, `file: ./frontend/apps/shell/Dockerfile`), and `frontend/.dockerignore`. `frontend/Caddyfile` had to move inside that context — a `COPY` cannot reach above it.

---

## Commands

Frontend commands run from `frontend/`, backend commands from `backend/`; see
each sub-file for the full list. From the repo root:

```bash
./run.sh                        # db → migrations → backend :8000 + shell :5173

docker compose up -d            # full local stack
docker compose restart backend  # after any Python edit (no --reload in Docker)
docker compose exec backend alembic upgrade head
docker compose exec backend pytest
```

---

## Recent Updates (2026-08-10, latest — final pre-ship audit)

Full audit before the first deploy. Detail in `PROGRESS.md`.

- **The SPA document shipped with no security headers.** `SecurityHeadersMiddleware`
  only decorates `/api/*`; Caddy serves `index.html` and set nothing but
  `Cache-Control` — no CSP, and **no `X-Frame-Options`, so the app could be
  iframed**. `frontend/Caddyfile` now owns the document headers. **Do not copy
  the backend CSP to the edge**: the API policy has no
  `fonts.googleapis.com`/`fonts.gstatic.com`, and the SPA loads both from
  `index.html` — reusing it silently drops DM Sans + Playfair app-wide. Verified
  against the real built image (fonts, `/api`, WS upgrade, deep-route fallback,
  and an unlisted host actually blocked). New `CSP_CONNECT_EXTRA` env var (wired
  through `docker-compose.prod.yml`) is where Sentry/PostHog hosts go.
- **`VITE_*` are build-time.** `analytics.ts` was unreachable in production
  because nothing passed them as Docker build args — Sentry and PostHog were
  dead code in every image. `apps/shell/Dockerfile` takes `ARG VITE_SENTRY_DSN`
  / `VITE_POSTHOG_KEY` / `VITE_POSTHOG_HOST`; `deploy.yml` passes them from repo
  secrets. Unset → empty → analytics off, unchanged default.
- **`deploy.sh` takes a verified `pg_dump` before pulling images.** Rollback
  restores image tags and cannot un-migrate, while the entrypoint runs
  `alembic upgrade head` on every boot. Non-fatal so it can't block a hotfix.
- **Mobile landing was broken**: header overflowed 375 → 486px, primary
  "Start Free" CTA entirely off-screen; 4-item stats strip overflowed both
  edges. Fixed in `landing.styles.ts`. Pricing page also still wore the
  pre-rename `aios` wordmark and read "1 of 6 module".
- **`token-lint` exits 0 now** — the notes below saying it fails on a stale
  baseline are obsolete; the baseline was re-locked 6 violations lower. CI still
  has `continue-on-error` on that step, so it is not yet a real gate.
- **Production refuses to boot on cleartext http.** `ALLOWED_ORIGIN` must be
  `https://` or `ALLOW_INSECURE_HTTP=true` must be set — otherwise `Settings`
  raises. Non-https means the auth cookie loses `Secure` and every JWT crosses
  the wire in the clear, which used to be a log warning nobody would read. A
  Hostinger VPS has a **free `srvNNNNNN.hstgr.cloud` hostname that Let's Encrypt
  accepts**, so TLS needs no domain purchase — `.env.prod.example` now defaults
  to https. All 8 production guards are covered both ways in
  `backend/tests/test_config_guards.py`.
- **`deploy.sh` self-installs the nightly backup cron** (idempotent, deploy
  user's crontab). Backup paths go through `resolve_backup_dir()`: `/var/backups`
  needs root and the deploy user is unprivileged, so it falls back to
  `$APP_DIR/backups` rather than emitting dumps that silently fail to write.
  **Both locations are on the DB's own disk** — copy them off the box.
- **`captures/parse` runs on `agent_openai_model`** (small tier), not the chat
  default. It is strict-JSON extraction and is deliberately unmetered (CAP-1),
  so per-call cost is the only ceiling.
- **token-lint is enforced in CI** (`continue-on-error` dropped) after proving
  it exits 1 on injected drift.
- **Verified, not assumed:** backend **280 passing**; tsc + build + vitest +
  token-lint clean; single alembic head `c003` and the full chain applies to an
  **empty** DB (77 tables); no route-level `user_id` scoping gaps; all admin
  endpoints `require_admin` + rate-limited.

---

## Recent Updates (2026-08-03 — Settings: one nav level, 6 sections → 7 real ones)

The global sidebar expanded Settings into the same six entries the page's own
rail already drew. Utsav asked for the local rail only, plus an audit of the
sections themselves. Full entry in `PROGRESS.md`.

- **`settings` lost its `subs`.** One list was rendered twice — once by the
  sidebar tree, once by `AreaSettingsPage`'s rail. The rail wins: it sits
  beside what it switches. **Routes unchanged** — every tab is still its own
  URL, breadcrumbs still resolve via `resolvePath`'s `startsWith` branch, and
  ⌘K offers one "Settings" entry instead of six near-identical ones.
- **Three sections rendered dead controls.** `control: 'select'` draws a chip
  with a chevron and **no handler** (`ShellKinds.ControlsKind`), so "OpenAI
  model", "Anthropic model", "Password", "Email verification" and "Billing
  status" read as dropdowns that could not be opened. All removed. **Do not
  use `control: 'select'`** until the kit gives it an `onSelect` path —
  `segment` and `toggle` are the controls that actually write.
- **Duplication removed:** sign-in method/email appeared in three sections; AI
  credits in three places across two; `ai`'s "Data access" table restated
  `sub.entitled` which `billing` already listed. Appearance's "Layout and
  motion" reported derived state (collapsed-section count, OS reduce-motion),
  not settings.
- **Endpoint-only config now has UI.** `knowledgeApi.save`/`.remove` had **no
  caller** (a source could be synced but never configured or removed);
  `billingApi.setFreeArea` had **no caller anywhere**; `integrationsApi.authUrl`
  works for all five providers and only Gmail called it. All built.
- **Seven tabs in three rail groups:** Account (Profile · Security & privacy ·
  Plan & usage) · Workspace (Appearance · Notifications) · Data & AI
  (Connections · AI & knowledge). Deleted `ProfileSection`, `AccountSection`,
  `ConnectionsSection`, `BillingModules`, `settings/shared.tsx`.
- **A settings card must be configurable** (second pass, same day). The rule:
  a card either contains a control that writes, is click-through to one, or
  shows status that actually changes. **All five `tiles` rows were deleted** —
  a KPI tile cannot be clicked, and each was restating the cards below it.
  Facts worth keeping moved to where they can be acted on (AI's model + key
  state → the card subtitle; Plan's monthly total → a row beside the portal
  button; connection expiry → the row next to its switch). Also gone:
  Appearance's domain-colour legend, Security's httpOnly-cookie "Session" row,
  Plan's "Modules in use" bar.
- **`onRowClick` makes EVERY row in a module a button.** So a module with one
  actionable row and one inert row must not use it — Security's Sign-in card
  keeps its header button instead, because there is no resend-verification
  endpoint for the email row. Same reason the empty Gmail row is not clickable.
- **Verified:** tsc, `pnpm build`, vitest clean. Six of seven tabs walked at
  1280px and 375px — zero console errors, `scrollWidth == clientWidth == 375`.
  token-lint fails identically on a pristine `git archive` of HEAD (stale
  baseline, separate task owns it) and **no file this task touched appears in
  any violation category**. **Plan & usage not walked with live data** — its
  modules need an authenticated `/billing/*` response.

## Recent Updates (2026-08-03 — PageHeader redesigned; one card corner app-wide)

Utsav supplied a "minimal Apple-style" header reference and asked every page
header to match it, with cards and KPIs sharing its corner radius.

- **`PageHeader` owns its surface now.** It was a bare typographic block that
  `PageContent` then dressed in `glass.shell` plus a domain-tinted radial wash —
  two owners for one surface, and a compositing layer laid over the page's own
  ambient mesh to show a title. The component is a solid card: `color.card`,
  hairline border, `elevation[1]`, `radii.md`, `spacing[5] spacing[6]` padding,
  40px icon chip at `radii.sm`. The domain colour survives as the chip tint via a
  new `tone` prop; `GlassPageHeader` is deleted.
- **The area label moved below the title.** It rendered as an uppercase eyebrow
  above it; the reference puts a meta line under the title, so
  `PageIdentity.eyebrow` → `PageIdentity.subtitle` (AppShell + PageLayout), and
  `PageHeader`'s subtitle is visible at every width instead of `display: none`
  below `sm`. The actions keep their own row there. The `eyebrow` prop stays on
  the library component, unused by the app.
- **One card corner: `radii.md` (16px).** `StatCard`, `ChartCard`, `InsightCard`,
  `DataTable`, PricingPage's panels and the AreaSettingsPage rail were at `lg`
  (20px) while `Card`, `KpiCard` and every `ModuleGrid` tile were at 16px. All on
  16px now. `lg`+ stays for overlay chrome (popovers, menus, chat bubbles).
- **Verified:** tsc, `pnpm build`, vitest clean. Walked live at 1280px and 375px,
  light + dark — measured header/cards/KPIs all at 16px, no horizontal overflow,
  zero console errors. token-lint fails identically on a pristine `git archive`
  of HEAD (stale baseline, separate task owns it) — **zero drift added**.

## Recent Updates (2026-08-02, latest — goals leave the areas)

Goals and milestones are set in **Workspace** for every domain. No area carries
a goals destination, a goal editor or a "Planning" section any more; an area's
Overview may show read-only progress and nothing else. Full entry in
`PROGRESS.md`.

- **Removed:** Finance's `goals` nav sub + `FinancePage` case (old URL redirects
  to Overview via `LEGACY_SECTIONS`), and Finance Settings' **"Planning" group**
  — Goals gone, Loans + Bills regrouped as "Commitments". Health Settings'
  "Goals" group is renamed **"Targets"**: those are the numeric reference lines
  the Body/Nutrition/Workouts modules draw against, not goal entities.
- **Kept, relocated:** Finance's savings pots (₹ target/current) still render at
  `/app/workspace/goals?domain=finance`. Their "Add" there used to open the
  macro-goal dialog — with Finance's destination gone that was the last surface
  showing pots, so a pot could not be created anywhere. Now opens
  `BudgetTabModal defaultTab="Goal"`.
- **`GET /api/goals` returns `progress_score`.** The Weekly Review has posted a
  score per goal per week since forever and nothing read it back. New `GoalRead`
  schema carries the latest score (one ordered sweep, not a per-goal subquery);
  `null` ≠ 0 — only "never scored" falls back to milestones.
- **`useDomainGoalsModule(domain)`** (`packages/shared/src/hooks/`) builds the
  `progress` module once for Finance Overview, Health Overview and Career's
  Journal. Score → else hit ÷ total milestones → else "Not scored". Returns
  `null` when the domain has no active goals.
- **Verified:** backend **248 passing** (+3 in `tests/test_goals.py`); tsc,
  `pnpm build`, vitest clean. `test_api_mappings` + token-lint are red on
  another session's uncommitted `api/areas/finance.py` work, not on this.
  **Not** walked in-browser — every affected surface is behind auth.

## Recent Updates (2026-08-02, later — canvas-alignment pass: five screenshots → five pages)

Utsav supplied five Claude Design screenshots and asked for the pages to match.
Detail: `frontend/docs/DC_REDESIGN_IMPLEMENTATION_PLAN.md` §8b, final section.

- **`PageHeader` is gone from every page; `PageDivider` too.** Content starts
  under the TopBar breadcrumbs, as the canvas draws it. It survives in exactly
  one place: `PageContent` (`@ct/shared`) renders a minimal eyebrow+title
  header **inside the page's own content column**, and only when that page has
  portalled a page-scoped control through `HeaderActionPortal` — the per-area
  Settings links, Career's "Log entry", the workspace domain filter,
  AreaSettingsPage's Back. Those are what keep
  `/app/{finance,health,career}/settings` reachable, since the routes are not
  in the nav tree. The title comes from the nav tree via
  `PageIdentityProvider` in `AppShell`, so no page hand-writes a section→label
  map. A page with no page-scoped control renders no header at all.
  **Note:** these controls briefly lived in the global TopBar earlier the same
  day; that was reverted on Utsav's call — the TopBar is permanent app chrome
  and must not carry one page's controls.
- **Module kit: 18 kinds → 21** — `hero`, `meters`, `agenda`. Plus `rows.mono`,
  `progress.valueKey`, `checklist.chips`, and `actionNode`/`actionVariant` on
  every card header.
- **Dashboard rebuilt** to greeting · 4 tiles · Focus | Schedule · 12-week heat.
  BriefingCard, OverviewInsightCard, DiscoveriesFeed and the 300px sticky rail
  are no longer rendered (files kept, unreferenced).
- **Transactions restyled, not stripped** — canvas card shell + 5-column
  DATE/MERCHANT/CATEGORY/ACCOUNT/AMOUNT grid, with bulk ops, inline edit, CSV
  import and the alternate views all intact (Utsav's explicit call).
- **`formatAmount()`** in `packages/shared/src/lib/utils.ts` — full
  Indian-grouped currency. `formatCurrency` still abbreviates over a lakh and is
  now for KPI tiles only.
- **Deltas are same-day cuts**, not month-to-date vs a whole previous month.
  Two canvas asks stay honestly unanswered: Plan's "vs capacity" and the
  dashboard's "Career streak vs last week".
- **Open:** the Financial-health score lost its tile (no slot in the canvas's
  finance:overview); `financeApi.healthScore()` has no caller and the backend
  route is untouched — re-site or retire is a product call.
- **Verified:** tsc + build + vitest green; token-lint counts identical to HEAD
  (zero drift added, still red on its stale baseline); all new module shapes
  walked at 1400px light/dark and 375px with no horizontal overflow.

## Recent Updates (2026-08-02 — Claude Design redesign: Phase 4 complete, all 34 destinations)

Every destination now renders its Claude Design canvas composition from **live
data**. Detail + the full departure table: `frontend/docs/DC_REDESIGN_IMPLEMENTATION_PLAN.md`
§8b. Branch `redesign/phase4-loans`.

- **Pages are data now, not layout.** A page builds a `ModuleSpec[]` from its
  API response and hands it to `ModuleGrid`. 18 module kinds cover all 34
  destinations. The module kit gained optional handlers (`onAction`,
  `onRowClick`, `onToggle`, `onTileClick`, `onCardClick`, `onPrimary`/
  `onSecondary`, `onSelect`, `onSwatch`) — all inert when unused, so the
  `/app/design` gallery renders exactly as before.
- **The rule for every judgement call:** where the canvas draws a control over
  something the backend does not store, the module becomes read-only `rows`
  rather than a switch that writes nowhere; where it draws an analysis the data
  cannot support, the module keeps the question and answers it from what
  exists. 16 such departures, each documented in the file it affects.
- **Backend follow-ups surfaced** (none blocking): `credit_limit` on Account;
  `muscle_mass`/`hydration` log types; sleep bedtime/wake/stages (Google Fit
  already integrated); an `agent_runs` table; quiet-hours window;
  `custom_instructions` on the user; per-area assistant scopes; sessions table
  + TOTP; an instance-metrics endpoint.
- **Deleted** (unreferenced after the conversions): WealthTab, PlanningTab,
  LedgerTab, AnalyticsTab, RulesTab, FitnessTab, NutritionTab, BodySleepTab,
  HistoryTab, OpportunitiesTab, `features/agents/*`, ModuleLayout,
  ModuleSidebar, ten Settings sections, DigitalCronInput, SideMenu, DocStyles,
  WaterTrackerWidget, and **SimulatorTab** — the What-If simulator, which the
  new Finance IA has no slot for. Its backend route is untouched.
- **Regression caught by `test_api_mappings`:** deleting Settings → System
  status took the Web Push handshake with it, so the Notifications push toggle
  was setting a preference while nothing registered a service worker. Rescued
  as `packages/shared/src/hooks/useWebPush.ts`; the toggle now subscribes the
  browser and refuses to record the preference if permission is denied.
- **MOBILE STRICT:** `tiles` is a scroll-snapped row below `md` (the
  dashboard PulseRow precedent) instead of a tall loose column; `AutoGrid`
  collapses an explicit `cols` to one column; `controls` rows wrap; the `table`
  min-width scales with column count.
- **Verified:** backend **246 passing** incl. the endpoint guard; tsc,
  `pnpm build`, vitest clean; walked at 1280px and 375px, dark + light, no
  horizontal overflow. token-lint still fails on its stale baseline (separate
  task owns it) but every count fell — spacing 107→95, rgba-in-shadow 33→27,
  inline-style 55→30.

## Recent Updates (2026-07-27 — VPS deploy pipeline: infra audit + auto-deploy on push to main)

Full audit of the Docker/compose/CI/env configs ahead of the Hostinger VPS
(AlmaLinux) launch, then rebuilt them. **Operator guide: `docs/DEPLOYMENT.md`.**

- **The prod stack could not serve the app.** `docker-compose.prod.yml` had no
  frontend service and no reverse proxy, and `backend` published no host port.
  `apps/shell/Dockerfile` ran `pnpm dev --host` — a Vite *dev server* — in
  production. Rewritten: multi-stage build → **`caddy:2.8-alpine` serving the
  compiled SPA from `/srv` and proxying `/api`, `/ws`, `/health` to
  `backend:8000`** (72 MB image). Same-origin is mandatory, not cosmetic: the
  axios baseURL is a relative `/api` and WS uses `location.host`.
- **`backend/.dockerignore` excluded `alembic/`** while `entrypoint.sh` runs
  `alembic upgrade head` — every real image build would crash-loop. It only
  looked fine because the dev compose bind-mounts `./backend` over `/app`.
- **Backend image**: multi-stage (deps layer keyed on `pyproject.toml` alone),
  non-root uid 10001, no dev extras, stdlib healthcheck (no curl in slim).
- **Dev compose published Postgres on `0.0.0.0:5434`** with a hardcoded
  password — Postgres on the public internet if that compose ran on the VPS.
  Now `127.0.0.1`-bound; Redis added so dev takes the same rate-limiter path
  as prod. The containerised frontend's Vite proxy targeted `127.0.0.1:8000`
  (= itself) — now `VITE_PROXY_TARGET`, set to `http://backend:8000`.
- **`.gitignore` never matched `.env.prod`** — the exact file the prod compose
  loads. Now deny-by-default `.env.*` with `!*.example`. Added `.env.prod.example`
  and a root `.dockerignore` (without it `COPY apps ./apps` dragged macOS-native
  `node_modules` into a linux image).
- **`ci.yml` still pointed at the deleted `frontend/` directory** — the frontend
  job had failed on every push since the 2026-07-20 monorepo conversion. Fixed
  to repo-root pnpm paths, made reusable (`workflow_call`), and gained
  ui-build + token-lint (advisory) + vitest steps.
- **New `.github/workflows/deploy.yml`**: push to `main` → CI → build both
  images on GitHub runners → GHCR → scp compose+script to the VPS → `deploy.sh`
  pulls, restarts, polls `/health` 120s and **rolls back to the previous image
  tags on failure**. Nothing is ever built on the VPS.
- **Cookie `Secure` now derives from the ALLOWED_ORIGIN scheme**, not from
  `ENVIRONMENT` — see the new Critical Gotcha below.
- **Prod compose project renamed `control-tower-prod`** — the old `control-tower`
  collides with the dev compose's directory-derived default and silently
  attaches to the **dev** `pgdata` volume.
- Fixed 3 unused imports (`AnalyticsTab`, `HealthPage` ×2) that failed
  `noUnusedLocals`; `pnpm build` was red on `main`, so the frontend image could
  not have built at all.
- **Verified, not assumed:** both images build; backend boots in
  `ENVIRONMENT=production` on an empty DB, auto-migrates to head (64 tables),
  `/health` → `{"status":"ok","db":true,"watcher":false}`; leader election
  elects exactly one of 2 workers; full stack end-to-end through Caddy — SPA
  deep-route fallback, immutable `/assets` + `no-cache` index.html, gzip
  857 kB → 266 kB, `/api` proxy, signup → login → `/api/auth/me`; cookie has no
  `Secure` on an http origin and gains it on https. Backend suite **231 passing**.
- **Open:** no domain yet (`SITE_ADDRESS=:80`, cleartext JWT — §4 of
  DEPLOYMENT.md is a two-line switch); `RESEND_API_KEY` must be set or
  production refuses to boot; DB backups need the cron install in
  `deploy/backup-db.sh`; root `package.json` still carries a
  `pnpm.onlyBuiltDependencies` key that modern pnpm ignores (the live setting is
  `allowBuilds` in `pnpm-workspace.yaml`).

## Recent Updates (2026-07-23 — Agent roster audit: Content Strategist retired, Professional Pulse opt-in)

Roster re-audited against the post-redesign product (Content area deleted 2026-07-21; plan centers Finance + Health).

- **Content Strategist retired** (`aios-content-strategist`): removed from `DEFAULT_AGENTS` + `_ACTIVE_BY_DEFAULT` in `api/agents.py`; migration **`ag02_deactivate_content_agent`** (new head) deactivates existing rows. Rows kept + `runners.py` still handles the task (same precedent as weekly-refresh) so old rows can be triggered/deleted.
- **Professional Pulse demoted to opt-in**: still seeded, no longer in `_ACTIVE_BY_DEFAULT`; existing rows keep the user's own on/off state.
- Seed roster = **7**; active by default = **4** (morning-brief, monthly-finance, health-coach, vault-extractor) + the two Gmail tracker agents which auto-enable on Gmail connect.
- Decision (no code): no "email router agent" or "calendar agent" — the 30-min `google_sync` job (free), the skip-if-empty email extractors, and Morning Brief's triage already cover that architecture. Backlog: intra-day important-mail push as a classifier step inside `gmail.sync_messages`.
- **Cost optimization (same day):** agents default to the **small model tier** — new `agent_openai_model` (gpt-4o-mini) / `agent_claude_model` (claude-haiku-4-5) settings, passed as `base_openai_model`/`base_claude_model` to `generate_text` (replaces only the settings default; per-user prefs and per-agent overrides still win). Applied at both agent LLM sites (`runners.py`, `email_extraction.py`) — ~94% cheaper per scheduled run. **Morning Brief skips dormant days**: `_build_context` now returns `(context, has_signal)` (day activity or calendar events = signal; gmail/knowledge alone ≠ signal); no signal → no LLM, no metering, no push. Kills the ~30 credits/mo burn per dormant user.
- Verified: full suite **205 passing** (+3 new tests: dormancy skip, runs-with-activity, base-model precedence); single alembic head `ag02`. Docker was down — migration applies on next `compose up`.

## Recent Updates (2026-07-22 — Google OAuth signup audit + profile-display privacy)

Audit of account creation via Google ("Continue with Google") plus the profile identity surfaces. All fixed + tested (backend 201 passing incl. new `tests/test_google_auth.py`; tsc clean; walked live in preview).

- **Google callback hardening (`api/auth.py`):** rejects Google accounts whose email Google itself hasn't verified (`verified_email`/`email_verified` False → 401 — was a link-by-email account-takeover vector); an unverified email/password signup who signs in with Google is now promoted to `email_verified=True` (Google proved the mailbox — they no longer stay stuck behind `require_verified`); name falls back to the email local-part when Google sends `name: null/""` (was `.get("name", …)` which only defaults on a missing key); `/auth/google/url` is rate-limited (10/min) and opportunistically purges `oauth_states` rows older than 15 min (no cron owns that table; every consumer's TTL is 10 min).
- **`GoogleAuthCallbackPage`:** single-submit `useRef` guard — StrictMode's double effect run used to POST the code exchange twice and the second call burned on the already-consumed state ("Sign-in failed" race); error card gained a "Back to sign in" button (was a dead end).
- **Profile surfaces never show the email address** (TopBar trigger + popover, Sidebar footer + popover): new `@ct/shared/lib/account.ts` `accountLabel()` renders `Administrator` / `Google account` / `Personal account` as the secondary line instead. This also killed the TopBar bug that labeled every non-Google user "Admin", and the `user@example.com` placeholder fallbacks. Full email now appears only in Settings and the verification banner. Test harness: `oauth_states` added to conftest's table list.

- **Gmail/Connections OAuth flow repaired (same day):** the redesign's orphan sweep (`41a6a7e`) had deleted `POST /api/integrations/{provider}/callback` (+ tracker auto-enable + initial sync helpers) — restored; SPA callback route moved from `/app/integrations/:provider/callback` to top-level `/integrations/:provider/callback` to match the backend's redirect_uri; `OAuthCallbackPage` got the single-submit guard and now returns to `/app/settings?section=connections`. **Scanner gotcha fixed:** `test_api_mappings` missed `api\n .post(...)` fluent chains (regex now `api\s*\.\s*(get|…)`) — that blind spot is what made the route look orphaned. Operator note: every deploy origin needs `<origin>/integrations/{gmail,gcal,gfit}/callback` AND `<origin>/auth/google/callback` registered in the Google Cloud OAuth client.

## Recent Updates (2026-07-21 — UI/UX audit + Expressive redesign, phases 0–5a)

Full audit of UI/UX, theme, CSS and features, then execution on branch
`redesign/expressive`. **-8,500 lines net.** Each phase is its own commit and
each is independently green (tsc / build / vitest / pytest).

- **Deleted:** Business and Content areas (Business's entire Dashboard tab was
  five files of hardcoded `EmptyState` with no API calls); Career demoted from
  3 tabs to one page; the guide section (whose sidebar linked
  `/app/guide/chat`, a route that never existed, dropping users out of `/app`);
  the duplicate Integrations page; the Discoveries wrapper; `ActionCenterStrip`
  (its only data producer is vault sync, force-disabled in prod); 114 unused
  declarations; **14 dead dependencies** including `react-hook-form`, `zod` and
  `is-odd`; 33 orphaned backend routes (212 → 179). **No DB tables dropped** —
  `config/domains.ts` separates ACTIVE from RETIRED domain keys so legacy rows
  still render.
- **Design system:** the two stacked token layers collapsed into one. See the
  Design System section above for what was broken and what replaced it.
- **Navigation:** `apps/shell/src/config/navigation.ts` is now the only nav
  list. 16 items → 10, and the 24 domain tabs across Goals/Projects/Sprints/
  Tasks became one `/app/plan` page with one filter, both in the URL.
- **Guardrail:** `scripts/token-lint.mjs` ratchets design-system drift.
  `pnpm lint` was dead the whole time (eslint isn't installed), which is why
  the drift accumulated; `noUnusedLocals` is now on instead.

**Open items:** `BUNDLE_PRICE` in `packages/shared/src/lib/pricing.ts` moved
$29 → $22 and needs product sign-off (6 modules × $5 = $30 made the old bundle
save $1). Phases 5b–7 — Finance/Health/Plan/Chat/Settings/Login surface
redesign, app-wide motion, and a11y/perf hardening — are not started.

## Recent Updates (2026-07-20 — Transaction tracker overhaul: Gmail → review → ledger)

The email transaction pipeline was rebuilt end-to-end (migration `t001_txn_tracker_gmail`, new alembic head):

- **Multi-account Gmail**: `integration_credentials` unique is now `(user_id, provider, account_email)` — a user links N Gmail accounts (bank alerts often arrive in a different inbox than the sign-in account). Gmail OAuth uses `prompt="select_account consent"`; all gmail service/API paths are account-scoped (`google_oauth.get_valid_access_token(..., account_email=)`, `list_provider_credentials`). Settings → **Connections** section (`ConnectionsSection.tsx`) lists/links/unlinks accounts. Connecting Gmail **auto-enables the tracker agent + fires an immediate sync** (`api/integrations.py` callback).
- **Sync fetches bodies for financial mail**: `gmail.sync_messages` iterates every connected account; besides the metadata sweep it runs a targeted query (curated Indian bank/UPI senders + subject keywords — `services/finance/email_sources.py`) and fetches `format=full`. `gmail_messages` gained `account_email`, `body_text`, `is_financial`, `extracted_at`; unique is `(user_id, account_email, gmail_id)`.
- **Two finance email agents, one engine** (`services/finance/email_extraction.py`; runners.py delegates — they do NOT use `_build_context`/`_SPECS`): `ct-upi-tracker` = **"Transaction Tracker"** (cron `0 */6 * * *`, alert emails, still off by default until Gmail connects) and new `ct-statement-reconciler` (daily `30 8 * * *`, statement line items, reconciled against ledger ±3d at same amount so alert-captured txns don't double-queue). **Skip-if-empty: no unextracted financial emails → no LLM call → no AI credit metered** (that's what makes 6-hourly affordable). Each email is parsed exactly once (`extracted_at` set even on 0 txns). Dedupe: `FinancePendingTransaction.dedupe_key` (UPI ref, else hash of kind|date|amount|payee) checked against all pending rows + ledger before insert.
- **Review-first**: `auto_commit_at` is nullable; NULL = wait for review (the default — migration nulled all existing pending clocks). Opt-in timed auto-commit via new `finance_settings.auto_commit_hours` (`GET/PATCH /api/areas/finance/settings`; UI in Finance Settings → Inbox Review; toggling re-clocks the existing queue).
- **Unified commit paths** (`services/finance/pending.commit_pending_to_ledger`, used by approve + auto-commit): resolves BOTH `category` rollup name AND `category_id` via `_resolve_category`, **adjusts account balance** (this changed approve semantics — it used to skip balances), 409/skip on same-day-same-amount ledger duplicates. FinanceIncome.`source` is the CATEGORY name again (origin marker moved to `tags` — the old approve wrote "upi-tracker" into it). New `POST /pending/bulk-approve` + `/pending/bulk-dismiss`; pending list returns `suggested_account_id` (last account used per source inbox). Server-side `match_suggested_category` (`services/finance/categorize.py`) pre-fills `category_id` at insert.
- **InboxTab**: source-account chip, pre-filled category/account, bulk Approve-all/Dismiss-all bar, "Waiting for your review" vs auto-commit countdown, empty-state "Fetch now" (triggers the tracker) + "Connect Gmail" CTAs.
- Tests: 204 passing (2 reworked for the new engine, +3 in `tests/test_txn_tracker.py`); conftest table list gained `GmailMessage`, `Category`, `FinanceSettings`. Phase-2 backlog: password-protected PDF statement attachments.

## Recent Updates (2026-07-20 — MONOREPO CONVERSION)

The frontend was converted from a single `frontend/` package into a pnpm-workspace monorepo (branch `monorepo`). **Zero logic changes — every file was `git mv`'d and only import specifiers were rewritten.**

- **Layout:** `apps/shell` (central app: router, AppShell nav, dashboard, chat, agents, workspace, goals, settings, guide, legal, landing, admin) + one app package per domain (`apps/finance|health|career|business|content`, each `src/pages` + `src/components`) + `packages/shared` (`@ct/shared`: api, stores, hooks, lib, theme, types, shared components) + `packages/ui` (`@ledgr/ui`, moved from `ledgr-ui/`).
- **Composition model:** ONE deployed SPA. The shell consumes domain apps + shared from **source** via Vite aliases (`apps/shell/vite.config.ts`), mirrored in root `tsconfig.json` `paths` and root `vitest.config.ts`. `@/` = shell-internal only; everything else imports `@ct/shared/...` / `@ct/<domain>/...`. Domain apps never import each other (verified — zero cross-domain imports existed).
- **Dependency policy:** all third-party deps live in the ROOT `package.json` only (single-version, one React/styled-components instance guaranteed); per-package manifests declare `workspace:*` graph edges only. `@ledgr/ui` went from `file:../ledgr-ui` (copy semantics) to `workspace:*` (symlink) — the old copy-dist-into-pnpm-store gotcha is obsolete; rebuild + clear `apps/shell/node_modules/.vite` + restart dev server is now enough.
- **Build/tooling:** root scripts `pnpm dev|build|test|lint`; shell build = `tsc -p ../../tsconfig.json && vite build` (one tsconfig typechecks the whole graph); vitest config at root covers `apps/*` + `packages/*`; frontend Dockerfile now at `apps/shell/Dockerfile` with repo-root build context (fixes the old "can't rebuild: ledgr-ui outside context" problem); `docker-compose.yml` frontend service + `run.sh` updated.
- **Backend touch:** `tests/test_api_mappings.py` `get_frontend_endpoints()` now scans `apps/*/src` + `packages/shared/src` (was `frontend/src`).
- **Verified:** `tsc -p tsconfig.json` clean, `pnpm build` clean, vitest 2/2, backend **201 passing** on host, dev server boots, landing + login pages render with zero console errors, all 5 domain page modules + shared api + AppShell + router dynamically imported in the live browser OK.

## Recent Updates (2026-07-14 — Production audit follow-up: tool history, Redis confirmations, index migration)

Continued from the production audit session (roadmap items from `ct-production-audit.html`):

- **P1 — Tool call/result persistence:** `ChatMessage.tool_calls` + `tool_results` JSON columns (existed since initial schema) are now populated. `openai_agent.py` now includes `call_id` in both `tool_call` and `tool_result` events. The WS handler in `api/chat.py` accumulates `turn_tool_calls`/`turn_tool_results` during streaming and saves them on the assistant `ChatMessage`. History loader reconstructs OpenAI-format tool turns from stored data: assistant entry gets `tool_calls` array + each result emitted as `{"role":"tool","tool_call_id":...,"content":...}` when provider=="openai". Anthropic path gets plain text history (unchanged).
- **P2 — Redis-backed pending_tool_calls:** `_pending_tool_set` / `_pending_tool_pop` helpers added to `api/chat.py`. When `REDIS_URL` is set, pending tool confirmations are stored in Redis at key `pending_tool:{user_id}:{call_id}` with 300s TTL. Falls back to the existing per-connection dict in dev. Confirmation flow now survives WS reconnects in production.
- **Finance composite indexes applied:** migration `p001_finance_composite_indexes` applied via `alembic upgrade heads`. 6 new composite indexes on `(user_id, logged_at)`, `(user_id, category_id)`, `(user_id, account_id)` across the three transaction tables.
- **UPI tracker vault log currency:** vault log entry in `services/chat/tools.py:650` now uses `account.currency` instead of hardcoded `"INR"`.
- **`.env` LLM_PROVIDER=nvidia → openai:** was causing backend container to crash on startup (pydantic rejected the value). Fixed directly in `.env`. Note: `docker compose restart` does NOT re-read `.env` — use `docker compose up -d backend` after env changes.
- **Confirmed stale notes cleaned up:** `SavedQuotesCard` was already built (prior session); CLAUDE.md note updated. `FitnessTab` workout goals already use the API (prior session).
- **Test suite: 200 passing** (uv run pytest on host).

## Recent Updates (2026-07-13 — Agents audit + optimize + timezone-aware crons)

Full audit of the 8 scheduled agents (power / usefulness / token cost / necessity / files), then optimized. Detail in memory `project_aios_web.md` → "Agents" section.

- **Vault Extractor de-miscosted:** it's a pure DB sweep (no LLM) but was billing **1 AI credit/day (~30/user/mo)** *and* was gated behind the AI quota so it silently **stopped syncing** once a user hit their cap. Now handled before the quota gate in `run_agent_task` — runs unconditionally, meters nothing.
- **Morning Brief → day-scoped facts** (`_morning_facts`: yesterday spend/workouts/captures + today's bills + open high-priority tasks) instead of re-reading a full 7-day cross-domain recap every day. Cheaper and fresher; each data pull is best-effort so one failing source degrades a line rather than crashing the run.
- **Weekly Refresh retired from the default roster** (redundant with Professional Pulse + Weekly Review page + Morning Brief; was already off by default). Roster now **7**; existing rows untouched, runner still handles it.
- **Timezone-aware crons:** new `Agent.tz` (IANA, migration `ag01_agent_timezone`, default UTC, backfilled from `BriefingPreference.tz`). Scheduler registers `CronTrigger(timezone=_safe_tz(agent.tz))` — "0 6 * * *" now fires at the user's local 6am, not 11:30 IST. Setting the timezone in **Settings → Briefing** (`POST /api/insights/briefing/preferences`) **propagates to every one of the user's agents and live-reschedules the active ones** — the single tz source of truth. Agent PATCH also accepts `tz` (422 on bad zone). Verified live: POST tz=Asia/Kolkata → all 8 agents flipped + rescheduled.
- **Push deep-links per-agent** (`_PUSH_LINKS`): Morning Brief → `/app`, Health → `/app/areas/health`, Finance → `/app/areas/finance` (were all hardcoded to `/app/finance`). Trigger endpoint now `require_module("agents")` (was legacy `require_plan("pro")`).
- **Net cost:** default-active agent load **~73 → ~30 credits/user/month (−59%)**. Verified: backend **163 passing**, migration applied to Docker PG, backend restarted (12/12 agents re-registered), live tz-propagation curl green.

## Recent Updates (2026-07-13 — Layout centralization + code-review fixes)

- **Theme/spacing centralization (root-cause fix):** Removed `spacing: appSpacing` override from `buildTheme()` in `src/theme/ctTheme.ts` — it was corrupting all 121 `@ledgr/ui` internal spacing usages (tripling them), causing huge gaps and broken scroll on GoalsPage. The 12pt structural scale (`1=12px … 24=288px`) now lives in `src/theme/layout.ts` as a standalone `spacing` export, completely separate from the DS 4pt component spacing.
- **`layout.ts` is now the single source of truth** for all app structural dimensions: `TOPBAR_HEIGHT` (48px), `BOTTOM_NAV_HEIGHT` (60px), `SIDEBAR_NAV_WIDTH` (228px), `SIDEBAR_NAV_COLLAPSED_WIDTH` (60px), `SIDEBAR_WIDTH` (288px), `SETTINGS_RAIL_WIDTH` (264px), `PAGE_MAX_WIDTH`, `PAGE_PADDING`, `COMMAND_PALETTE_WIDTH`, `ASSISTANT` dims. All previous hardcoded px values in `TopBar`, `BottomNav`, `Sidebar`, `AreaSettingsPage`, `AppShell`, `WorkspaceLayout` migrated to these constants.
- **Code-review bugs fixed:** `WorkspaceLayout Main` gap `16px→24px` (CLAUDE.md mandates 24px; gap+margin-top doubling); `AppShell ContentArea padding-bottom: 72px→${BOTTOM_NAV_HEIGHT}` (orphaned hardcode after layout.ts migration); `AreaTabs.tsx // @ts-nocheck` removed from line 1 (was suppressing all TS errors in a file rendered on every area page — tsc confirmed clean after removal).
- **Polish:** `setTimeout(10)→requestAnimationFrame` in `AssistantChatInput.handleMention` (layout-timing correctness); deprecated `.substr(2,9)→.slice(2,11)` (×2) in same file.
- **`layout.ts` usage rule:** `theme.spacing` = DS 4pt grid for component-internal spacing; `layout.spacing` (from `@/theme/layout`) = 12pt grid for app structural decisions (section gaps, page padding). Never conflate the two.
- **Verified:** `tsc --noEmit` clean.
- **Pending deletion (user-approved, blocked by classifier):** `backend/test_chat.py`, `frontend/update_progress.py`, `design-system/control-tower/`, `lessons.md`, `SAAS_IMPLEMENTATION_PLAN.md`, `docs/SHIP_READINESS_AUDIT.md`, `docs/DESIGN_SYSTEM_AUDIT.md` — delete manually.

## Recent Updates (2026-07-13 — Design-system audit: assistant module de-God + ledgr-ui radii.xs)

- **Assistant module split:** `AssistantChatInput.tsx` (1128→382 lines) and `GlobalAssistant.tsx` (650→391 lines) split into lean orchestrators. Extracted: `chatUtils.ts` (QUICK_PROMPTS + buildHiddenContext), `GlobalAssistant.styles.ts` (19 styled components), `AssistantChatInput.styles.ts` (keyframes + 16 styled components), `FilePreviewCard.tsx` (AttachedFile + FilePreviewCard + PastedContentCard), `ModelSelector.tsx` (Model + ModelSelector). `ChatPage.tsx` import of `buildHiddenContext` updated to `chatUtils`.
- **`radii.xs` type gap closed:** added `xs: '4px'` to `ledgr-ui/src/theme/tokens.ts` — the token existed at runtime in `ctTheme` but was absent from the TS type, causing tsc to reject `theme.radii.xs`. Rebuilt ledgr-ui and copied dist to pnpm store.
- **Verified:** `tsc --noEmit` + `pnpm build` clean.
- **Deferred (by decision, not bugs):** TransactionsTab.tsx (@ts-nocheck, HIGH risk), CategoryPicker.tsx (portal flyout), CommandPalette.tsx (keyboard nav), IconButton ledgr-ui primitive, DS-bypass sweep (74 inline styled.button), retokenize 476 hardcoded hex literals.

## Recent Updates (2026-07-12 — Agents audit + optimize)

Audited all 8 scheduled agents (power / usefulness / token cost / necessity / files). Roster is now **7** (Weekly Refresh removed from the seed — overlapped Professional Pulse + the Review page + Morning Brief, already off by default; existing users keep their row, runner still handles it). Fixes in `services/agents/runners.py` + `api/agents.py`:
- **Vault Extractor was miscosted:** a pure DB sweep (no LLM) that was gated behind the AI quota (so it silently stopped syncing once a user hit their cap) AND metered 1 AI credit every day (~30 wasted credits/user/month). Now runs above the quota gate and meters nothing. Default-active agent credit load drops ~73→~43/mo.
- **Morning Brief** now pulls day-scoped facts (`_morning_facts`: yesterday's spend/workouts/captures + today's bills + open high-priority tasks) instead of a full 7-day cross-domain recap every day — cheaper and fresher. Each data pull is best-effort (one failing source degrades a line, doesn't crash the run).
- **Push deep-links** are per-agent now (`_PUSH_LINKS`: brief→`/app`, health→`/app/areas/health`, finance→`/app/areas/finance`) — were all hardcoded to `/app/finance`.
- **Trigger endpoint** gated by `require_module("agents")` (was legacy `require_plan("pro")`).
- Deferred (noted, not bugs): agent crons are UTC so "06:00" = 11:30 IST (needs a tz field); `_agent_subscribers` is in-process (scheduled-run WS events miss clients on other workers — needs Redis pub/sub); Morning Brief agent + opt-in Dashboard briefing both make a daily brief (kept both by decision).
- Verified: backend 163 tests green (updated `test_build_context_scoped` for day-scoped facts), clean Docker boot, roster asserted at 7.

## Recent Updates (2026-07-12 — AI Assistant overhaul: audit → fix → reform)

Full-stack assistant pass (FE/BE/DB/Vault). Detailed ledger row in `docs/WORLD_CLASS_REDESIGN_PLAN.md` §12; execution plan in `~/.claude/plans/audit-my-ai-assistant-async-sundae.md`.

- **Cross-tenant vault leak CLOSED:** `services/chat/context_builder.py` used to inject the shared vault (master.md / session-log / area context, hardcoded "Utsav") into EVERY user's system prompt, and the 3 vault tools wrote to one shared FS for all tenants. Now all vault access (context + `read_context`/`append_log`/`update_context` + `_append_vault_entry` mirrors, incl. agent write-backs) gates on `services/vault_sync/owner.is_vault_owner` (owner = first user, same rule as the watcher). Non-owners get RAG-only knowledge and a vault-less tool list.
- **Prompt caching architecture:** system prompt split into byte-stable `STATIC_SYSTEM_BASE/_VAULT` + per-turn `<context>` block (date/name/vault excerpts/RAG) prepended to the LATEST user message only — persisted history stays raw. Anthropic path sends `cache_control` breakpoints (system list-form + last message block, markers moved each tool iteration); OpenAI path benefits from automatic prefix caching. Cache usage logged at both call sites (`chat usage ... cache_read=`/`cached=`). **anthropic SDK bumped 0.34.2 → 0.116.0** (old SDK predates GA cache types).
- **Cost trims:** embedding LRU memo (context-RAG + same-turn `search_vault` share one embed), `user_has_chunks` existence check + <12-char heuristic skip RAG entirely, vault file I/O via `asyncio.to_thread` (chat-path SYNC-1/2 closed), session titles from first message (no LLM call), tool schemas slimmed (github stub / `log_finance_transaction` alias / legacy create_action fields removed — `execute_tool` still accepts the alias for old queued AgentActions).
- **Security/correctness:** WS `model`/`provider` validated against `core/llm_models.py` allowlist (`allowed_openai_models`/`allowed_claude_models` in config; also enforced on agents PATCH); new `GET /api/chat/models` is the single source for every frontend model menu (3 stale hardcoded lists deleted); Anthropic output tokens accumulated (`+=`, was overwritten → budget under-debit); malformed tool-JSON guarded in the assistant echo block; `approve_action` executes via `action_runner` (was status-only — approval effectively cancelled the action); chat WS sliding-window rate limit per connection (uses previously-dead `rate_limit_chat_per_min`); naive substring injection blocklist deleted — external tool results (gmail/notion/calendar) wrapped in `<external_data>` tags with a treat-as-data rule in the static prompt.
- **Scheduler leader election:** `pg_try_advisory_lock` held on a dedicated connection; only the lock-holder runs APScheduler + agent seed backfill (multi-worker duplicate LLM spend/pushes fixed). Verified with a second uvicorn worker ("Scheduler not started — another worker holds the leader lock").
- **Frontend:** `/app` prefix restored across BottomNav, CommandPalette NAV_COMMANDS, g-goto shortcuts (all dead-ended on the marketing page); **new `/app/chat` ChatPage** (history rail + thread + composer, `RequireModule module="chat"`); ⌘K ask hands off via `navigate('/app/chat', { state: { prefill } })` — router state survives StrictMode (sessionStorage relay deleted); **⌘J toggles the assistant drawer** (uiStore `assistantOpen`) + sidebar "Chat" entry; drawer + page share `components/assistant/messages.tsx` (remark-gfm tables, `<think>`/artifact parsing, tool timeline, streaming cursor, error Retry) and `SessionList.tsx` (rename via ledgr Dialog, delete via ConfirmDialog — native prompt/confirm gone); virtualizer replaced with pinned autoscroll (follows stream unless user scrolls up); 7-day history cutoff removed; quota line under the composer (`tokenBudget` + done-event tokens); AgentCard grid-view used `agent.id` instead of `task_id` for patch/trigger → 404s, fixed.
- **Removed:** `GlobalCapture.tsx` (orphaned), fake upload spinner (files encode at send, not before), dead "More models" item, decorative Extended-Thinking toggle (nothing read it), `monospaceFont` in UI chrome (mono = code blocks only), AgentsPage fake-terminal palette + traffic-light dots, AgentsToolbar raw `<select>`s → ledgr Input/Select/SegmentedControl. Root `test_chat.py` converted to a non-collected manual probe (was flaky-failing the suite against a live server).
- **Deployment note:** the stack currently runs in **Docker** — backend :8000 (NOT the old local :8001 note), db :5434; frontend container stopped in favour of the host Vite dev server (the frontend image can't rebuild: `file:../ledgr-ui` is outside its build context, so the container predates remark-gfm). After backend Python edits: `docker compose build backend && docker compose up -d backend` when deps changed, plain `restart` otherwise.
- **Live-verify follow-ups (same session):** `.env` still had legacy `LLM_PROVIDER=nvidia` — an unknown provider fell through both branches into an Anthropic client with no key and killed every chat turn; `stream_chat_response` now normalizes unknown providers and falls back to whichever provider has a key (friendly `no_api_key` error if neither). Session titles strip the hidden `[System: …]` prefix. ⌘K ask now also works when already ON /app/chat (prefill captured from `location.state` changes, not just mount). **openai SDK 1.47.0 → 1.109.1** so `prompt_tokens_details.cached_tokens` is visible in the usage logs.
- Verified: backend **163 passing** on host (incl. `test_api_mappings` guarding `/api/chat/models`), `tsc --noEmit` + `pnpm build` clean, 2-worker leader test; live walk in preview — real chat turn (streamed answer + Thoughts block + pinned autoscroll + title in rail + quota ticking), ⌘K ask auto-sent on ChatPage, ⌘J drawer toggle, mobile BottomNav lands in-app, agents grid toggle `PATCH /api/agents/ct-vault-extractor → 200`, zero console errors. **Cache proof: `chat usage … input=2680 cached=2560` — 95% of the prompt served from the provider prefix cache.**

## Recent Updates (2026-07-06 — Workspace & UI Consistency Polish)

- **Workspace Entity CRUD:** Implemented full edit capabilities (Pencil icon + Dialog) for Projects, Sprints, and Tasks. Added backend `PATCH` endpoints for Projects and Sprints.
- **Global Header Consistency:** Enforced `@ledgr/ui` `PageHeader` standard (with `icon`, `eyebrow`, and `PageDivider`) across `ProjectsPage`, `SprintsPage`, `TasksPage`, and `ReviewPage`.
- **Review Page Layout:** Refactored `ReviewPage` to use the global `PageContainer` and `PageContent` layout system while preserving its custom 860px max-width reading format.
- **Domain Goals Consolidation:** Removed standalone `DomainGoalsCard` widgets from individual area pages (Health, Career, Business, Content) to centralize macro-goal tracking within the `GoalsPage` tabs.

## Recent Updates (2026-07-06 — ship-readiness audit)

Launch config confirmed with user: **billing OFF, public multi-tenant SaaS, multiple/autoscaled workers, live LLM key**. Findings verified with live cross-tenant attacks (not code-reading) + fixed:
- **Isolation on all new routers (goals/actions/forecasts/insights/automations/simulator) PASSED** — created a 2nd real user, every cross-tenant read/write returned 404, no list leaks, unknown automation template 422. (These were never in the isolation test suite before.)
- **FIXED — goals had no DELETE/PATCH:** users could create but never remove/edit goals. Added `PATCH`/`DELETE /api/goals/{id}` (ownership-checked, cascades progress rows), frontend `goalsApi.update/remove` + delete button w/ ConfirmDialog on GoalsPage. `test_api_mappings` guard now green.
- **FIXED (cost blocker) — uncapped AI spend:** `ai_allowed` returned True whenever `billing_enabled=false`, so on a billing-off PUBLIC launch every signup had UNLIMITED LLM spend on our key. Now: dev/self-host (non-prod, billing off) stays unlimited; **production enforces `ai_free_monthly_credits` (default 200) as a hard per-user monthly cap** even with billing off (paid overage still works when billing on). Degrades gracefully (REST→402/UpgradeWall, agents→facts-only). Regression test `test_public_free_launch_hard_caps_ai` added.
- **FIXED (data-leak guard) — vault sync:** it's single-tenant (one shared FS, not per-user). Production now **REFUSES TO START** if `VAULT_SYNC_ENABLED=true` unless `VAULT_SINGLE_TENANT_ACK=true` — prevents a forgotten env var leaking all vaults on hosted SaaS. Verified the guard raises.
- **FIXED (multi-worker) — rate limiter in-memory:** now uses Redis when `REDIS_URL` set (shared counters across workers), warns loudly in prod when unset. **OAuth state was already DB-backed** (not the old in-process dict) — multi-worker safe.
- **Verified solid, no change:** prod secret validation, cookies (httponly/secure-in-prod/samesite=strict), CORS single-origin, no frontend secrets, GDPR account-deletion (derives tables from live ORM metadata → new tables auto-cascade). Suite **54 passing**, tsc + build clean.
- **OPERATOR PRE-LAUNCH CHECKLIST (must set in prod .env):** `ENVIRONMENT=production`, `VAULT_SYNC_ENABLED=false`, `REDIS_URL=redis://…`, run uvicorn/gunicorn with `--proxy-headers --forwarded-allow-ips=<LB_IP>` (else rate-limit keys on the LB IP → all users share one bucket), 32+char `APP_SECRET_KEY`, non-default `APP_PASSWORD`, `AI_FREE_MONTHLY_CREDITS` tuned. Still deferred (need product/infra decision, not code): the 5 new routers are ungated (fine while billing off); Stripe not test-mode-verified (moot while billing off); email verification on signup for public abuse.

## Recent Updates (2026-07-06 — card audit & consolidation)

Full per-tab card census + dedup pass (findings in `docs/WORLD_CLASS_REDESIGN_PLAN.md` §11.1):
- **Dashboard:** removed `OverviewInsightCard`'s "Daily Brief" toggle mode — it duplicated the newer persisted `BriefingCard`. `OverviewInsightCard` is now single-purpose "Life Overview" (cross-domain synthesis). Note: internal brief-mode helpers (`briefMutation`, `parseBrief`, `BriefView`, `SegControl`) left in place but unreferenced (tsc `noUnusedLocals:false`) — safe to prune later.
- **Finance Overview (HomeTab):** dead `FinancialInsights` import (imported, never rendered) → replaced with a rendered `<ForecastWidget domain="finance" />` (forecast previously only on Goals).
- **Finance Analytics:** removed duplicate "Budget Tracking" card (== Budgets tab "Limits by Category"); replaced with `SubscriptionManagement` — a built-but-never-rendered widget from `AdvancedWidgets.tsx`.
- **Gotcha observed:** an external formatter re-added a duplicate `import { ForecastWidget }` line to HomeTab AFTER my edit (tsc/build had passed pre-dupe), which broke the Vite dev transform with "Identifier already declared" while the built bundle stayed fine — if a page 500s on dynamic import after edits, check for duplicate import lines injected on save.
- Health/Career/Business/Content census clean — no duplicate cards.

## Recent Updates (2026-07-04, night — What-If Simulator)

### Finance What-If Simulator (new tab #6 on Finance)
- `services/finance/simulator.py` — baseline from the user's real trailing 90 days (Σ account balances; monthly income; spend mean/std from three 30-day buckets) → deterministic projection + **400-run Monte-Carlo** (`random.gauss`, fixed seed so identical inputs give stable bands) → p10/p50/p90 series + first month the median crosses ₹0.
- `POST /api/areas/finance/simulate` (gated by the finance module like the rest of the router; 422 when there's no history). Levers: `months` 3–24, `income_delta_pct`, `spend_delta_pct`, `one_time_amount` + `one_time_month`.
- `SimulatorTab.tsx`: WorkspaceLayout rail (horizon `SegmentedControl`, tokenized native range sliders — ledgr-ui has no Slider primitive yet, thumb circle is structural/exempt), assumptions box, 3 KPI cards, Recharts stacked-area p10–p90 envelope + median + dashed steady path + ₹0 `ReferenceLine`. Debounced (450ms) auto-rerun via React Query keyed on params.
- Verified: curl math (−20% spend), live lever re-run in preview, tsc + build clean, zero console errors.

## Recent Updates (2026-07-04, later — plan R0–R5 COMPLETE)

### "Do it all" completion pass (Claude)
- **Dashboard:** `BriefingCard` (renders `/api/insights/briefing/today`, bold-md, Open Review) + `PulseRow` (new `GET /api/insights/pulse` — 5-domain tiles w/ deltas + 30d Sparklines, scroll-snap on mobile).
- **Forecasting is real now:** `services/ai/forecasting.py` (was an empty stub) — deterministic EOM-balance linear burn + least-squares weight slope, idempotent per day; `forecasts_nightly` job 02:30 UTC; `forecast_engine.py` (on-demand button; had fatal `Expense`/`Income` import bugs) rewired to the same pipeline; `/forecasts/generate` 422s (not 500) on thin data.
- **Automation engine:** `services/automations/engine.py` — 5 tick templates (bill_reminder_3d, streak_save_evening, weekly_review_sunday, payday_snapshot → FinanceSnapshot upsert, idle_goal_nudge_7d), tz-aware local-time gates (tz from BriefingPreference), cooldowns via `last_fired_at`, hourly `automation_tick` (:05); `is_rule_enabled()` gates the budget-alert push channel (bell/WS always fires).
- **Settings:** new Briefing section (enable/time/push; tz auto-captured on save); Automations section fixed (was hitting `/api/api/...` 404s, fake `--color-*` CSS vars, hand-rolled pill toggle → ledgr `Switch`; budget_80_push shown default-ON to match server).
- **⌘K Command Bar 2.0 done:** GlobalCapture UNMOUNTED from AppShell — its duplicate ⌘L listener cancelled the palette's (⌘L was dead); palette owns nav + `>`/numeric log mode (parse → confirm card, verified) + `?` ask mode which hands off to Chat via `sessionStorage['ct.chat.prefill']` (ChatPage reads it with deferred removal — **StrictMode double-mount consumes one-shot storage keys**, defer cleanup ~1.5s). The old fake hardcoded ask answer is gone; `/chat` route bug → `/app/chat`.
- **New Critical Gotcha:** after bumping/rebuilding ledgr-ui, `rm -rf node_modules && pnpm install` is NOT enough for the dev server — **also `rm -rf node_modules/.vite`** (or the optimizeDeps cache serves the old bundle and new exports crash the app at runtime while tsc stays green).
- Verified: tsc + `pnpm build` clean, zero console errors; pulse/forecast/automations endpoints curl-tested; briefing/synergy/forecast/automation jobs run manually; Dashboard/Settings/palette/Chat-handoff walked in preview. Remaining nice-to-haves in plan §12 backlog row (chat tool-rows, agents drawer, Highcharts swap, contrast script, email channel).

## Recent Updates (2026-07-04)

### R1–R5 landed (Gemini implementation + Claude validation/fix pass)
- **New surfaces:** Goals (`/app/goals`), Weekly Review (`/app/review`), Discoveries (`/app/discoveries`) + sidebar nav; Dashboard gained LifeHeatmap (real data via `GET /api/insights/heatmap`), DiscoveriesFeed, ActionCenterStrip. New backend: `api/insights.py` (briefing/discoveries/heatmap), `api/automations.py`, `services/insights/{briefing,synergy}.py` + APScheduler jobs (`insights_briefing` */15min tz-aware, `insights_synergy` 03:00 UTC). Migrations through `ecd685e0986e` applied. ledgr-ui **0.1.13** (InsightCard, Sparkline, PageHeader mobile overflow menu).
- **Both LLM sites metered** (`ai_allowed` + `record_ai_usage`, sources `briefing`/`synergy`) with facts-only fallbacks; briefing honors `deliver_at`+`tz` (zoneinfo) and is idempotent per (user, date).
- **Backend currently runs LOCALLY, not Docker**: uvicorn on **:8001** (Vite proxies `/api`→127.0.0.1:8001), no `--reload` → kill + relaunch after Python edits. **:8000 is a DIFFERENT project (Ledgr CA-desk)** — never assume it's Control Tower.
- **Gemini-code review gotchas (recur on any AI-generated code):** literal `\"\"\"` escaped docstrings (SyntaxError — backend won't boot); Tailwind classNames on new pages (Tailwind is removed → renders unstyled; rewrite in styled-components); mock/random data left in "wired" components; Radix idioms (`asChild`/`iconOnly`/`sideOffset`) passed to ledgr-ui's own Popover/Button (breaks tsup DTS build); missing `user_id` scoping/metering. Grep for all of these when validating generated code.
- Remaining tail tracked in `docs/WORLD_CLASS_REDESIGN_PLAN.md` §12 (⬜ row): Dashboard briefing hero, Settings Briefing/Automations UI, automation trigger engine, Pulse Row, Command Bar 2.0, forecast scheduler job.

## Recent Updates (2026-07-03)

### UI/UX audit + R0.1 polish pass + WORLD-CLASS master plan
- **`docs/WORLD_CLASS_REDESIGN_PLAN.md` is now the forward source of truth** for UI/UX redesign + AI features (Briefing, Synergy Engine, ⌘K Command Bar 2.0, Action Center, Life Heatmap, Weekly Review, Forecasts, automation templates). Phases R0–R5 with per-task files + verify steps; §12 status ledger must be updated every session.
- **R0.1 shipped:** 12 pill-radius (`999px`) sites → `theme.radii.sm/md` across 8 files (OverviewInsightCard, GreetingHero, RelevantCards, TodaysTimeline, AgentsPage, GuideOverview, PipelineTab, CategoryManager); Transactions view switcher Select → `SegmentedControl size="sm"`; `formatCurrency` negative → `-₹5.94L`; Health "1 days" pluralized; stale "Use the rail" empty-state copy fixed (BodySleepTab/NutritionTab); Finance HomeTab fixed-380px cards → `AnalyticsCell` (auto-height on mobile); Phase-5 WIP `@/components/ui/card`→`ui/Card` casing fix.
- **New Critical Gotcha — `KpiGrid` (ledgr-ui ≥0.1.9):** `overflow-x: auto` makes overflow-y computed `auto`, so inside a height-constrained flex column the grid silently shrank and vertically clipped KPI values (Health Body & Sleep showed label-only 66px cards). Fixed with `flex-shrink: 0` on `KpiGrid`. Also: after a ledgr-ui reinstall the running Vite dev server keeps serving the OLD optimized dep from memory — **restart the dev server** after `pnpm install`, and note `rm -rf node_modules/@ledgr && pnpm install --force` does NOT re-copy (full `rm -rf node_modules && pnpm install` does).
- **`theme.radii.xs` exists at runtime (ctTheme) but not in the ledgr-ui radii TS type** — using it fails tsc; use `sm` or extend the type (plan §3.1).

## Recent Updates (2026-07-01)

### Backend audit — Opus 4.8 second pass
Re-ran the full audit on the stronger model to verify the 2026-06-30 fixes and catch what the parallel-Sonnet pass missed.
- **Verified sound (no rework):** the chat `user_id` threading, `core/deps.py` auth (JWT + `token_version` revocation, mirrored on WS), `core/security.py` (PBKDF2 600k + Fernet), and `core/entitlements.py` gating (`require_module`/`ws_entitled`/`modules_for_subscription` all fail closed — no auth bypass).
- **AGT-2 (new, fixed):** `services/agents/runners.py` `run_agent_task` metered AI usage but never enforced `ai_allowed()` — the symmetric twin of the chat-WS gap (CHAT-4), on both the scheduled and manual-trigger paths. A user over the free monthly AI cap who doesn't own a metered module (`{chat, agents}`) got uncapped agent LLM spend, contradicting `services/billing/usage.py`'s own quota model. Now gated: over-quota → graceful **facts-only** output (same fallback path as an LLM failure). No-op when billing is disabled (dev/self-host unchanged).
- **CAP-1 (new, deliberately NOT fixed):** `api/captures.py` `/parse` (⌘L quick-log) is an unmetered LLM call — left as-is (rate-limited 30/min, cheap 200-token call, core capture UX where a hard cap hurts more than it helps).
- **FIN-3 deadlock note:** the `_adjust_balance` `with_for_update()` lock means two concurrent opposite-direction transfers (A→B and B→A) could theoretically deadlock; Postgres detects+aborts one (self-healing, rare, strictly better than the prior no-lock race). Only worth addressing (lock accounts in id-sorted order) if it ever surfaces in logs.
- Full second-pass detail in the `project_backend_audit.md` memory file.

## Recent Updates (2026-06-30)

### Full backend audit + autonomous fix pass (all 9 domains)
- **Chat was completely broken in production.** `services/chat/agent.py` and `services/chat/openai_agent.py` (OpenAI is the **default** provider) called `reserve_budget`/`get_token_budget_status`/`record_usage` with the wrong arg count/order (missing `user_id`) — every chat message crashed on both providers. Fixed by threading `user_id` through `stream_chat_response`/`stream_openai_chat_response`/`execute_tool`. Also fixed: `get_calendar_events` tool called `get_stored_events` with wrong arg order; chat WS never enforced `ai_allowed()`/AI quota before streaming (now checked before processing each message).
- **`delete_business` 500'd on any business with events** — `business_events.business_id` FK has no `ondelete` and the handler never cleaned up child rows. Fixed by explicitly deleting `BusinessEvent` rows before the `Business` delete (no migration needed).
- **IDOR fixes**: `toggle_habit_check` (health) had no ownership check on `habit_id`; `create_event` (business) and content item create/patch accepted a `campaign_id`/`business_id` with no ownership verification; `import_commit` (finance) never validated `account_id` ownership. All now 404 on cross-tenant IDs.
- **Finance**: `_adjust_balance` did `float()` arithmetic on a `Decimal` column (rounding drift) and had no row lock (race condition under concurrent writes) — now uses `Decimal` math + `with_for_update()`. Added `Field(gt=0)`/`ge=0` constraints to Bill/Loan/Investment/Budget create models (previously accepted negative/zero amounts).
- **Status enum validation added** where previously unconstrained: `Business.status`, `JobOpportunity.status`, content item `status` (create now 422s instead of silently downgrading to `"idea"`; patch now validates too).
- **Stripe webhook (`BILL-1`)**: `_seen_events` idempotency cache marked an event "seen" *before* the DB write succeeded — a failed apply was permanently lost on retry/resend. Now marks seen only after successful processing.
- **`/health` was unauthenticated + completely unrated** (DoS risk against the DB pool) — added `@limiter.limit("30/minute")`. Same for admin `list_users`/`system_stats` (inconsistent with the rest of `admin.py`).
- **Vault watcher non-determinism**: picked "first user" via unordered `select(User).limit(1)` — added `order_by(User.created_at)`.
- **`scheduler.py`'s 5 fixed cron jobs shared one outer try/except** — one bad registration silently blocked the rest (including `scheduler.start()` itself). Wrapped each `add_job` in its own try/except via a `_safe_add_job` helper.
- **`VaultWriteGuard._resolve`'s traversal check used `str.startswith`** (bypassable via a sibling dir sharing the vault path as a prefix) — switched to `Path.is_relative_to`. Also added an explicit `ALLOWED_READ_PATHS` allowlist to `read_file()` (previously relied solely on the traversal check, no allowlist at all) — built from the union of `ALLOWED_WRITE_PATHS` + the one extra fixed path (`05-content/pipeline/twitter-queue.md`) actually read via the guard.
- **`_INSECURE_DEFAULTS` didn't include the actual default `app_password`** (`"demo1234"`) — added it, so a forgotten prod env var now correctly fails the startup secret check.
- **Deliberately NOT fixed** (flagged in `project_backend_audit.md` memory, need a product/infra decision rather than a safe patch): `AUTH-1` (rate-limit IP keying breaks behind a reverse proxy — needs trusted-proxy config), `BILL-2` (in-process Stripe idempotency cache isn't durable across workers — needs a DB table), `ADMIN-2` (`admin_delete_user` has no audit trail), `BILL-3` (webhook no-ops silently on unknown Stripe customer), `FIN-1` (`update_account` lets the client overwrite `balance` directly — **left as-is**, `AccountManager.tsx` has a legitimate, already-wired "correct account balance" form using this exact field; removing it would break working UX, and it's owner-scoped so not actually IDOR).
- Full findings (~50 across all 9 domains, severity-sorted, with the LOW-severity backlog) live in the project memory file `project_backend_audit.md` — read it before further backend work to avoid re-auditing already-covered ground.
- Verified: `pytest` inside the backend container → 49/53 passing, the 4 non-passing are pre-existing Docker-exec environment artifacts (container `.env` `APP_PASSWORD` shadows the test default; frontend tree not mounted for `test_api_mappings`) unrelated to any change this session.

## Recent Updates (2026-06-23)

### Finance transaction / account / category audit
- **Split-amount input rejected whole numbers** (`min="0.01"` + default `step="1"` → "nearest valid values are 19.01 and 20.01"). Added `step="0.01"` to the split inputs + the filter min/max inputs.
- **`TransactionModal` reset/prefill never ran** — it hung form reset on `onOpenChange(true)`, which the Dialog never fires (close-only). Moved to a `useEffect` on `[open, editing, initialKind]`; edit now prefills, reopening "New" now clears, split mode resets. Verified live.
- **Category CRUD was disconnected from the txn form.** Unified the query key to `['finance', 'categories']` across `CategoryManager`/`QuickAddAccounts`/`TransactionsTab` (was a split `['finance_categories']`), and the expense category dropdown (incl. splits) now merges user categories + defaults with case-insensitive de-dup.
- Added **Transfer same-/missing-account validation**; made the Add-Account **currency a `Select`** (was free-text, inconsistent with `AccountManager`); fixed `filterMin/Max` `|| ''` dropping a legitimate `0` → `?? ''`. See the two new "Critical Gotchas" (Dialog onOpenChange, number-input step).
- **Removed the split-across-categories feature** entirely from `TransactionModal` (state, toggle, panel, mutation logic, dead styled-components) per user request — it caused the input-validation issues. The legacy `splits` param on `createExpense` is no longer sent (backend split endpoint stays for old data; the row-level `split` badge still displays historical split transactions).
- **Hierarchical categories (migration `h012`).** Category model gained `kind` (income/expense trees kept separate); global `(user_id,name)` unique dropped (uniqueness now per parent+kind, enforced in the API); `finance_income` gained `category_id`. New `CategoryPicker.tsx` = cascading flyout (desktop) / drill-down (mobile) with "use parent only" + inline create. Transactions now store `category_id` + a top-level rollup name; manual expense/income **require an account** (modal blocks with an "Add account first" dialog when none exist). Verified live: pick category→subcategory, inline-create a subcategory, account-required, save persists `category_id`. **Remaining (not yet built):** subcategory-wise report view (rollup-to-parent already works), showing the leaf path in the txn row, and a `kind` toggle in the standalone `CategoryManager`.
- **Fixed a critical pre-existing backend bug: every transaction save 500'd.** `finance_expenses/income/transfers.logged_at` are tz-naive columns but the frontend sends tz-aware ISO (`…Z`) → asyncpg `DataError`. Added the `NaiveDateTime` annotated type in `api/areas/finance.py` and applied it to all 5 `logged_at` create/update fields. Verified live: expense save now returns 200. (Needs `docker compose restart backend`.) See the new "Critical Gotcha".

### Business/Content audit + app-wide dropdown fixes + modular pricing UI
- **Global `Select` was silently broken in 8 files.** `@ledgr/ui` `Select` uses **`onChange`**, but many call sites passed **`onValueChange`** (leftover antd/Radix prop) — ignored at runtime, so the dropdown never updated state. Separately, the children-style `<Select><SelectItem/></Select>` API **never shows the selected label in the trigger** (placeholder forever). Fixed both by converting every usage to the **`options` prop API** + `onChange` + explicit `placeholder`: business `BusinessLogModal`/`EventsTab`, career `CareerLogModal`(×3)/`OpportunitiesTab`(×2)/`CareerPage`(×2), content `ContentEditorDrawer`(×5)/`ContentPage`(×3 filters), `AdminPage` (2 native `<select>` → `Select`), finance `BudgetsTab`, health `NutritionTab`. **Rule: never use `onValueChange` or bare `<SelectItem>` children on `Select` — always `options=` + `onChange`.** (`Tabs` legitimately uses `onValueChange`.)
- **`@ledgr/ui` build was stale** — `dist/` predated `src/Card.tsx`, so the mobile `CardHeader` wrap changes weren't reaching the app. Rebuilt (`npm run build` in `ledgr-ui/`), **bumped `0.1.0 → 0.1.1`**, and clean-reinstalled the frontend so the `file:` dep re-copies. **Gotcha: pnpm caches `file:../ledgr-ui` by lockfile hash — after editing ledgr-ui you must bump its version (or `rm -rf node_modules && pnpm install`); `pnpm install --force` alone does NOT re-copy.**
- Modular pricing marketing UI shipped — see the pricing pivot note below.
- **Phase 0 (modular pricing) — closed the area-gating auth bypass.** Backend `require_module` now enforces module entitlement on every area + service router + the chat/agents WS. See the pivot note's "Area-gating auth bypass CLOSED" backlog entry for detail. Backend suite **37 passing** (added 5 enforcement tests; fixed a pre-existing `test_api_mappings` false positive on named-type query params).
- **Phase 1 (modular billing) — `modules` is now the source of truth.** Migration `h010` (modules/bundle/free_area + backfill); entitlement reads modules; `/catalog` + `/modules` + `/free-area` endpoints; `set_modules`/`reconcile_subscription` + multi-line-item webhook; `STRIPE_MODULE_PRICES`; frontend `RequireModule`, PricingPage CTA → `setModules`, Settings module panel. Backend **44 passing** (+7). Live-Stripe paths still need test-mode verification; metered AI is Phase 2. See pivot note for full detail. **Run `alembic upgrade head` to apply `h010`.**
- **Phase 2 (metered AI) — usage recorded + capped.** `AIUsageRecord` (migration `h011`); `services/billing/usage.py` (`record_ai_usage`/`usage_this_month`/`ai_allowed`/`monthly_summary`/`report_usage_to_stripe`); metering wired at all 3 LLM sites (`api/ai.py` ×4 + quota dep, agent runner, chat WS); `GET /billing/usage`; hourly APScheduler reporting job; Settings usage gauge; `ai_free_monthly_credits` config. Backend **50 passing** (+6). Stripe usage *reporting* call needs live keys; otherwise complete. **Run `alembic upgrade head` for `h011`.**
- **Phase 3 (billing polish).** `reconcile_subscription` now attaches the metered `ai_usage` item when a metered module (chat/agents) or bundle is owned (so usage reporting has a target). `past_due` is a **grace** status — `GRACE_STATUSES` keeps module access while Stripe retries (webhook + entitlement aligned); Settings shows a "Payment failed — update card" dunning row. Backend **53 passing** (+3). **Deliberately deferred:** dropping the legacy `plan`/`addons` columns (still used by `admin.py`, `/checkout`, `require_plan` for `ai.py`, `/subscription`) — do that as a focused cleanup *after* live-Stripe verification, not before.
- Verified: `tsc --noEmit` clean, `pnpm build` clean, pricing configurator state-management smoke-tested live in the browser, backend `pytest` 37/37 green.

## Recent Updates (2026-06-22)

### Pricing Model — Pivot to Dynamic / Modular Hybrid (decided 2026-06-22; backend not yet built)
**Decision:** move off the fixed 4-tier model (below) to **pay-only-for-what-you-use**. Full model + phased file-level plan in `docs/DYNAMIC_PRICING_PLAN.md` (summary below).

- **Model = Hybrid:** flat monthly price per enabled module + **metered AI usage** billed on top.
- **8 modules** (each independently purchasable): areas `finance · health · career · business · content` + services `chat · agents · integrations`.
- **Free base:** Dashboard + **1 area of the user's choice** (`Subscription.free_area`), free forever.
- **"Everything" bundle:** single discounted Stripe price that grants all 8 modules.
- **Single source of truth:** replace the `plan` rank + `addons` guesswork with `Subscription.modules: list[str]` + `bundle: bool`. Entitlement = `get_entitled_modules(user)` (admin / billing-disabled → ALL; else `{free_area} ∪ modules`, or ALL if `bundle`).
- **Stripe:** one Subscription, **one line item per owned module** (+ a metered `ai_usage` item). Toggle = add/remove item (prorated); bundle = swap to the bundle price. Webhook must rebuild `modules` from **all** line items (current webhook reads only one → can't represent multi-module subs).
- **Metered AI:** `AIUsageRecord` table + `meter_ai_usage()` at the 3 LLM sites (`services/chat`, `services/agents/runners.py`, `services/ai`); free hard-cap for non-payers, metered overage for Chat/Agents owners; APScheduler job reports usage to Stripe.
- **⚠️ Must-fix during this work:** area/add-on gating is currently **frontend-only** (`RequireArea` in `router.tsx`) — the backend `api/areas/*` + service routers have **no** plan check, so any user can hit them via curl (auth bypass). New `require_module(key)` dependency must gate every area + service router server-side. This is Phase 0 and ships independent of Stripe.
- **Rollout:** Phase 0 (entitlement core + `require_module` enforcement + `addons→modules` migration) → Phase 1 (modular Stripe billing + dynamic PricingPage) → Phase 2 (metered AI) → Phase 3 (dunning + docs sync).
- **Pricing decided (2026-06-23):** **$5/module/mo**, **$29/mo "Everything" bundle** (all 8 — cheaper than 6 à la carte), metered AI surfaced on the marketing pages.
- **✅ Marketing UI shipped (2026-06-23), backend still Phase 0/1:** `frontend/src/lib/pricing.ts` is the single source of truth (`MODULE_PRICE=5`, `BUNDLE_PRICE=29`, `PRICING_MODULES`, `computeMonthly`). `PricingPage.tsx` is now an interactive module **configurator** (toggle modules → live total, "Everything" bundle, metered-AI note); `LandingPage.tsx` preview + Free/Everything compare table read the same constants. Both format via the shared `usePricingCurrency` hook. **CTAs route to `/signup` or `/app/settings`** — `billingApi.checkout` is still plan-based (`'pro'|'pro_plus'|'household'`), so real modular checkout is still Phase 1. The old 4-tier `PricingPage`/`LandingPage` copy is fully removed.

### Subscription Tiers and RBAC Enforcement (SUPERSEDED by the dynamic pricing pivot above — describes current code only)
The system now enforces a 4-tier subscription model with specific area and feature gating:
- **Starter (Free)**: Basic access to Finance, Health, and Career. Features limited by usage caps (e.g. 50 items/mo, 1 bank account).
- **Pro ($12/mo)**: Unlimited Finance, Health, and Career. Unlocks premium features (Chat Assistant, Agents, advanced analytics, custom prompts).
- **Pro Plus ($20/mo)**: Everything in Pro. Base tier required to purchase advanced modules as add-ons: Business (+$10/mo) and Content (+$10/mo).
- **Household ($24/mo)**: Pro features for 5 members + shared features. Add-ons must be purchased separately per member.

**Backend Implementation**: Added `addons` JSON column to `Subscription` model (`b88ba8bcced2`). Admin API updated to handle the `pro_plus` plan and assign add-ons. Backend `require_plan` dependency updated to automatically bypass all paywall checks for `is_admin = True` users.
**Frontend Implementation**: Introduced `RequirePlan` and `RequireArea` wrapper components in `router.tsx` to handle routing-level RBAC (with automatic bypass for admin users). Updated `PricingPage.tsx` and `LandingPage.tsx` to display all 4 tiers accurately.

### Mobile UI Layout Refinements
Enhanced the responsive behavior of key UI primitives across the application to provide a better mobile experience:
- **`AreaToolbar` & `@ledgr/ui CardHeader`**: Updated flex layouts to gracefully wrap (`flex-wrap: wrap`) on narrow screens instead of overflowing or squishing controls. Inner slots (left/right) break into multiple rows when needed, preventing cut-off components (like DateNav chevrons).
- **Subtexts**: Visually muted elements like `ToolbarMeta` and `CardSubtitle` (e.g., "0 of 0 pieces") are automatically hidden on mobile screens to preserve valuable space for primary actions.
- **`AreaTabs`**: Retained horizontal scroll (`overflow-x: auto`) for primary navigation tabs to ensure predictable layout and preserve vertical space, adhering to mobile UX best practices.

### Content area → full Content Management System
The Content area was rebuilt from a single Kanban tab into a complete CMS with **6 tabs**:
- **Overview** — KPI cards (total/published/scheduled/ideas), pipeline-by-stage bar, platform-mix pie, publishing-cadence area chart, upcoming-scheduled + recently-published lists.
- **Pipeline** — 4-column drag-and-drop Kanban (idea → in_progress → scheduled → published) via `@dnd-kit`; cards show platform, priority dot, date, metrics, tags. Click a card to open the editor.
- **Calendar** — month grid (prev/next/today nav) plotting scheduled (dimmed) + published (solid) content on publish dates.
- **Library** — filterable/sortable `DataTable` of everything (search + platform/status/type filters); row click opens the editor.
- **Campaigns** — campaign/series CRUD (name, goal, description, colour stripe, date range), per-campaign item counts; items reference `campaign_id`.
- **Analytics** — engagement KPIs (views/likes/comments/shares), content-by-platform bar, type-mix pie, top-5 performers ranked by weighted engagement.
- **Editor**: `ContentEditorDrawer` (right-side `Sheet`) — title, platform, type, status, priority, pillar, campaign, tags, AI-drafted body (`aiApi.draft`, gated behind `require_plan("pro")` → `UpgradeWall` on 402), publish date, live URL, notes, and manual engagement metrics. Create + edit + delete in one surface.

**Backend** (`backend/app/api/areas/content.py`, `models/content.py`, migration `h009`):
- `ContentItem` extended: `body`, `tags`, `pillar`, `campaign_id` (FK, `ON DELETE SET NULL`), `priority`, `position`, `scheduled_at`, `published_at`, `url`, and metrics `views/likes/comments/shares`. Patch auto-stamps `published_at`/`publish_date` on the idea→published transition.
- New `ContentCampaign` model + `content_campaigns` table (`UNIQUE(user_id, name)`).
- New endpoints: campaign CRUD (`/campaigns`), `/stats` (aggregations: by_status/platform/type/month, metric totals, top performers), richer `/items` filters (content_type, campaign_id, tag, `q` search). All user-scoped.
- Obsolete components removed: `ColumnDropZone`, `ContentCaptureModal`, `DraftModal` (superseded by the new tabs + drawer). Shared meta in `components/areas/content/contentMeta.ts`.

### Three security/quality audit rounds (all pushed to `claude/control-tower-audits-jywmwh`, PR #1)
- **Round 1 — feature/UX**: Admin panel (5 endpoints + `is_admin` migration `h006` + `require_admin` + `RequireAdmin` guard), empty states on finance tabs, landing-page rewrite, AI feature gates (`require_plan("pro")` + `UpgradeWall`/`is402`), 4 missing finance tabs wired (Goals/Loans/Investments/Bills).
- **Round 2 — security**: `OAuthState.user_id` FK (`h007`) so integration state tokens are user-scoped; push `subscribe` scoped to `(user_id, endpoint)` (no cross-user hijack); `RequireAdmin` null-user race fixed; admin mutations rate-limited; CSP `ws:/wss:` narrowed to the configured origin; HSTS in production; `decode_access_token` now logs failures.
- **Round 3 — isolation + correctness** (`h008`): replaced **6 global unique constraints** with per-user composites (`finance_snapshots`, `finance_categories`, `skill_inventory`, `calendar_events`, `google_fit_metrics`, `push_subscriptions`) — two users could previously block each other's inserts. Fixed `/chat/token-budget` crash (called `get_token_budget_status()` with no `user_id`). Rate-limited `/auth/me`, `/auth/profile`, `/auth/change-password`, `/auth/me DELETE`, `/chat/sessions DELETE`, `/sync/status`, `/sync/conflicts`. Removed `@ts-nocheck` from 5 page/tab files — surfaced and fixed a real bug where CareerPage `<Select onValueChange>` (ignored prop) never fired the mutation; fixed `<Skeleton active>` and untyped `PublishedDropZone`. `tsc --noEmit` clean across the frontend.

### Business area → Multi-Business Portfolio Hub
The Business area was completely refactored from a monolithic single-business dashboard into a dynamic, multi-tenant Portfolio Hub:
- **Portfolio Hub View**: Default view shows a grid of active businesses.
- **Business Creation**: A "Create Business" modal allows users to create isolated entities with custom name, `business_type` (SaaS, Agency, E-commerce, Content, Freelance), description, and theme color.
- **Dynamic Detail Views**: Clicking a business routes to `BusinessDetailView`, which conditionally renders entirely different sets of `<AreaTabs>` tailored to the `business_type` (e.g., `SaasTabs`, `AgencyTabs`, `EcommerceTabs`).
- **Backend Isolation**: `Business` and `BusinessEvent` models fully support `business_id`. Endpoints (`/areas/business/`, `/areas/business/events`, `/areas/business/summary`, `/areas/business/mrr-history`) conditionally filter data to the specific business, allowing users to track independent MRR, feature shipments, and events across multiple businesses without data bleeding.

## Recent Updates (2026-06-21)

- **Ship-readiness audit + isolation fixes** (`docs/SHIP_READINESS_AUDIT.md`): the earlier "multi-tenancy enforced" claim was only true for the 5 area routers. Fixed the rest this session — chat (C2), captures (C3), integrations (C1), push, and the WS handlers (C5) are now user-scoped. Integrations & agents got composite unique constraints (`UNIQUE(user_id, provider)` = migration `h002`; `UNIQUE(user_id, task_id)` = `h003`). **Run `alembic upgrade head`.**
- **Vault sync descoped from hosted SaaS**: it is single-tenant (one shared `vault_path`, globally-unique `VaultFile.path`). Gated behind `VAULT_SYNC_ENABLED` (default `true` for self-host; set `false` in hosted prod). Backend 404s/closes WS when off; frontend hides the UI via `GET /api/features`.
- **Agents are now real + per-user**: `_run_agent` calls `services/agents/runners.py` (LLM over the user's own data), default agents seed per-user on signup + startup backfill, scheduler job ids are `{task_id}:{user_id}`. Fixed a latent `_broadcast_agent(user_id, event)` mismatch that was crashing digest/anomaly/budget/recurring jobs.
- **Auth hardening**: legacy env-credential login backdoor ignored in production (H1); `EmailStr`-style + 8-char password validation (H5); `ENVIRONMENT` documented in `.env.example` (H2).
- **Isolation tests + signup + billing**: `backend/tests/test_isolation.py` (multi-tenant guardrail) + fixed test harness; self-serve signup UI (login/signup toggle + `/signup`); Stripe billing scaffold (Subscription model migration `h004`, `/api/billing/*`, `require_plan()` entitlements, Settings + Pricing wiring). Backend suite 32 passing. Run `uv sync` for `stripe`.
- **Legal Pages**: Added `PrivacyPolicyPage`, `TermsOfServicePage`, and `SupportPage` in `frontend/src/pages/legal/` with public routing and footer links on the login page.
- **Google Integrations**: Implemented Google OAuth flow (`GoogleAuthCallbackPage`), added `google_sync` models and tables (`g001`), and created integration services for Google Calendar and Google Fit (`google_calendar.py`, `google_fit.py`).
- **UI Refactoring**: Cleaned up finance components by removing deprecated `FinanceStats` and `WalletWidgets`. Consolidated `FilterBar` and `StyledIcon`.
- **Gitignore Update**: Ignored AI assistant artifacts (`.agents/`, `.claude/`, `.gemini/`).
- **Multi-Tenancy Enforced**: Fully refactored the database schema and backend to enforce multi-tenancy. Added `user_id` FKs to all 36 data tables (migrations applied) and updated all 178+ API queries and background services to filter operations by `current_user.id`.

---

## Known Issues / Backlog

- **Multi-tenant isolation tests** live in `backend/tests/test_isolation.py` (11 tests, "user A can't see user B's rows" for chat/captures/integrations/agents). Keep them green and extend them when adding any user-data endpoint. Test harness uses in-memory SQLite (StaticPool) and excludes the pgvector vault tables.
- **Auth still open**: OAuth `state` is an in-process dict (breaks on >1 worker — needs Redis, H3); JWT has no revocation/refresh (logout only clears the cookie, H4).
- **Billing scaffolded (M1)** — Stripe Checkout/Portal/webhook, `Subscription` model (migration `h004`), Free/Pro/Household entitlements via `app/core/entitlements.py` `require_plan()` (no-op until `billing_enabled`). **OFF until `STRIPE_SECRET_KEY` + `STRIPE_PRICE_PRO` set + `uv sync` (installs `stripe`).** Gating applied to agent-trigger + integration auth-url. **Being replaced by the dynamic/modular pricing pivot — see `docs/DYNAMIC_PRICING_PLAN.md` + the pivot note under Recent Updates (2026-06-22).**
- **✅ Area-gating auth bypass CLOSED (2026-06-23, Phase 0).** `entitlements.py` now has the module catalog + `get_entitled_modules(db, user)` + `require_module(key)` (→ **402** with `{"module": key}`). Wired into every area + service router at `include_router` in `main.py`, and the `/ws/chat` + `/ws/agents` handlers (`ws_entitled`, close 1008). Inert when `billing_enabled=false` (dev/self-host unchanged) and for admins. Until Phase 1, the entitled set is *derived* from the existing `plan`+`addons` (`free → finance/health/career`; `pro/pro_plus → +chat/agents/integrations`; `addons → business/content`; `household → all`). Tests: `test_billing.py` (free user → 402 on business/content; addon grants; admin/billing-off → all). `require_plan` retained for `ai.py` (now knows `pro_plus` rank).
- **✅ Phase 1 — modular billing built (2026-06-23, except live-Stripe verification).** `Subscription` gained `modules`/`bundle`/`free_area` (migration **`h010`**, backfilled from `plan`+`addons`; legacy cols kept). `entitlements.get_entitled_modules` now reads `modules`/`bundle`/`free_area` (`modules_for_subscription`), falling back to plan-derived for un-backfilled rows. New endpoints `GET /billing/catalog`, `POST /billing/modules`, `POST /billing/free-area`; `GET /billing/subscription` returns `modules`/`bundle`/`free_area`/`entitled`. Service: `set_modules` (billing-off → persist free; billing-on → `reconcile_subscription` Stripe multi-item diff/checkout), and the **webhook now rebuilds `modules` from ALL line items** (was `items.data[0]` only — the bug that made add-ons unpurchasable). Config: `STRIPE_MODULE_PRICES` JSON map; `billing_enabled` accepts it. Frontend: `RequireArea`/`RequirePlan` collapsed into one `RequireModule` (reads `sub.entitled`); PricingPage CTA calls `billingApi.setModules`; Settings "Billing & modules" panel. Backend suite **44 passing** (+7). **⚠️ Remaining:** the existing-subscription Stripe item-diff + checkout completion are only exercisable with **Stripe test-mode keys** (no offline coverage); legacy `plan`/`addons` columns not yet dropped (kept for transition).
- **✅ Phase 2 — metered AI built (2026-06-23, except live-Stripe usage reporting).** `AIUsageRecord` table (migration **`h011`**) — one row per metered AI action. `services/billing/usage.py`: `record_ai_usage`, `usage_this_month` (calendar month), `ai_allowed` (free monthly cap → hard-cap for non-payers, overage for Chat/Agents owners; unlimited when billing-off/admin), `monthly_summary`, `report_usage_to_stripe` (drains unreported → Stripe metered usage; clean-drains when no `ai_usage` price). Wired at the **3 LLM sites**: `api/ai.py` (4 endpoints + `enforce_ai_quota` dep + record), `services/agents/runners.py` (record), `api/chat.py` WS (record per response). `GET /billing/usage`; hourly APScheduler job `billing_usage_report`; Settings usage gauge; `ai_free_monthly_credits` (default 200). Suite **50 passing** (+6 `test_usage.py`). **⚠️ Remaining:** the outbound Stripe `create_usage_record` needs **live test-mode keys** + an `ai_usage` price/subscription-item (the latter not yet added by `reconcile_subscription`).
- Self-serve signup UI shipped (login/signup toggle on `LoginPage` + `/signup` route). Profile + change-password screens still pending (backend endpoints exist).
- Vault sync watcher may miss rapid successive file changes (debounce needed) — self-host mode only now.
- FitnessTab workout goals stored in localStorage — needs backend API endpoint
- **Content CMS metrics are manual**: `views/likes/comments/shares` are entered by hand in the editor drawer. Auto-sync from YouTube/Twitter/LinkedIn integrations is not wired yet — the Analytics tab reflects whatever is logged. Drag-reorder persists status only (not intra-column `position`); the `position` column exists but isn't yet driven by the UI.
- F5 splits+tags: code complete, migration `c7d2e9f1a3b4` written but not verified (Docker was down at time of writing)

---

**Last Updated**: 2026-07-01 | **Version**: 0.4.0 | Pricing: pivoting to dynamic/modular hybrid (planned — see `docs/DYNAMIC_PRICING_PLAN.md`)

