# Project: AIOS Web

## What this is

A full-stack personal life-management OS — Finance, Health, Career, Business, Content — with AI agents, vault sync, and multi-LLM integration. **Transitioning from single-user to multi-tenant SaaS (decided 2026-06-21).** All new DB/backend work must be multi-user aware: `users` table, `user_id` FK on every user-data table, row-level isolation.

---

## 📍 Progress Snapshot (auto-synced)

**Last synced:** 2026-07-01

**Shipped:**
- 3 rounds of multi-tenancy/security audits closed the original IDOR + isolation leaks; a full 9-domain backend re-audit (2026-06-30) + Opus second pass (2026-07-01) verified the fixes and caught one more (uncapped agent LLM spend, now gated).
- Pivoted billing from fixed 4-tier to modular pay-per-module ($5/module, $29 bundle) — Phases 0-3 (entitlement gating, Stripe multi-item billing, metered AI, dunning) are code-complete; only live-Stripe test-mode verification remains.
- Content area rebuilt into a full 6-tab CMS; Business area rebuilt into a multi-business Portfolio Hub.
- "Premium Black + Gold" design system (@ledgr/ui) locked and rolled out app-wide.
- Backend suite: 53 tests passing. `tsc`/`pnpm build` clean.

**Uncommitted right now:** health tab, sidebar, admin/landing/pricing/settings pages, and theme files are dirty in the working tree (post the theme-palette-system commit `a06efb9`).

**Next up** (see `docs/PRODUCT_ROADMAP.md`):
- Verify Stripe billing end-to-end with test-mode keys; drop legacy `plan`/`addons` columns once verified.
- Phase 2 — Engagement: Daily Executive Briefing, logging-streak heatmap, make the 8 scheduled agents actually useful (or hide them).
- Phase 3 — the actual moat: the cross-domain Synergy Engine (nightly correlation job → AI Discoveries feed). Nothing built yet.
- Backlog carried forward: OAuth state needs Redis (breaks on >1 worker), JWT has no revocation, Content CMS metrics are manual-entry only.

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite + **@ledgr/ui** (component library at `ledgr-ui/`) + styled-components + Ant Design (complex widgets only — Tabs, DatePicker, Segmented)
- **Backend**: Python 3.11+ + FastAPI + SQLModel (async SQLAlchemy) + asyncpg
- **Database**: PostgreSQL 15 + pgvector
- **AI/LLMs**: Anthropic Claude SDK, OpenAI SDK, NVIDIA NIM (`settings.nvidia_chat_model`, default provider)
- **Real-time**: FastAPI native WebSockets (`/ws/sync`, `/ws/chat`, `/ws/agents`)
- **State**: Zustand (global) + React Query / TanStack (server state)
- **Auth**: JWT in httpOnly SameSite=Strict cookie (`aios_token`). Google OAuth added 2026-06-21.
- **Package managers**: pnpm (frontend), uv (backend)
- **Container**: Docker + docker-compose

---

## Design System — "Premium Black + Gold" (locked since 2026-06-20)

**Tailwind is fully removed.** All styling is styled-components + @ledgr/ui theme tokens.

| Token | Value |
|---|---|
| Background | `#FAFAF9` (warm stone off-white) |
| Foreground | `#0C0A09` |
| Card | `#FFFFFF` |
| Primary | `#1C1917` (near-black) |
| Primary hover | `#292524` |
| Accent / Gold | `#CA8A04` (amber gold) |
| Font (UI/body) | `DM Sans` |
| Font (display) | `Playfair Display` (numbers, hero values only) |
| Shadows | Flat/clean — no claymorphism |

**HARD RULES:**
- Never use `hsl(var(--x))` — CSS vars are HEX, use `var()` or `color-mix()` directly
- No serif fonts in body/UI (Playfair Display = display numbers only)
- No white/highlight inset shadows on buttons
- `ThemeProvider` with `aiosLightTheme` wraps the whole app (`src/theme/aiosTheme.ts`)
- `src/index.css` = minimal pre-render reset only; no utility classes
- **MOBILE STRICT**: In mobile/tab this app should feel like it's made natively for mobile/tab, not some app built for web and responsive to mobile. Design elements (especially KPIs) must compactly fit in single rows on small viewports rather than stacking loosely.

---

## Architecture

### Frontend

- SPA via React Router v6; `RequireAuth` guard on all area routes
- Feature areas: Finance / Health / Career / Business / Content — each has dedicated page + `<AreaTabs>` sub-nav (never nest Tabs)
- API: functions in `frontend/src/api/` — no raw fetch or axios in components
- Styling: `styled.div` / `styled(Component)` everywhere; `className` in SC = CSS selector hook, NOT utility
- `WorkspaceLayout` + `RailHeading` pattern: analytics/lists → center; inputs/forms → right 300px sticky rail
- **Settings Layout**: Any settings page (global or domain-specific) MUST use the standard two-panel layout (`AreaSettingsPage`). Do not build inline settings tabs or custom settings layouts.
- `GlobalCapture` (⌘L): uses `@ledgr/ui Dialog`, parses NL text via `/captures/parse`, routes to correct domain

### Backend

- Routers: `backend/app/api/areas/<domain>.py` for each domain
- Service layer: `backend/app/services/` (finance, insights, notifications have sub-folders; others are direct in routers)
- No `--reload` in Docker — **restart required after any Python edit**: `docker compose restart backend`
- Alembic: always review autogenerated migrations — autogenerate tries to DROP `captures` table (model not imported in env). Strip unrelated drops before `upgrade head`.
- APScheduler jobs: recurring finance post (01:00 UTC), budget alerts (on expense write), anomaly scan (04:00 UTC), weekly digest (Sun 13:30 UTC), bill notifications (03:30 UTC)

### WebSockets

- Backend: `api/sync.py`, `api/chat.py`, `api/agents.py`
- Frontend hooks: `useChat.ts`, `useNotifications.ts`, `useVaultSync.ts`
- Always call `ws_auth(websocket)` BEFORE accepting frames; close with code 1008 on auth failure

---

## Project Structure

```text
aios-web/
├── frontend/
│   ├── src/
│   │   ├── api/               # All HTTP calls — never call fetch/axios directly in components
│   │   ├── components/
│   │   │   ├── layout/        # AppShell, Sidebar, TopBar, BottomNav, WorkspaceLayout
│   │   │   ├── ui/            # Shared primitives (AreaTabs, Skeleton, TextTabs…)
│   │   │   ├── dashboard/     # Dashboard card components
│   │   │   └── areas/         # Domain-specific components (finance/, health/, content/…)
│   │   ├── hooks/             # useChat, useNotifications, useVaultSync, useKeyboardShortcuts…
│   │   ├── lib/               # Utility fns (formatCurrency, parseLocalDate, fmtDateKey…)
│   │   ├── pages/             # Page-level components
│   │   ├── stores/            # Zustand stores (authStore, uiStore, notificationStore, dayEventsStore)
│   │   ├── theme/             # aiosTheme.ts — all design tokens
│   │   └── router.tsx         # All routes + RequireAuth guard
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── api/               # Route handlers
│   │   │   └── areas/         # finance.py, health.py, career.py, business.py, content.py
│   │   ├── services/          # Business logic
│   │   │   ├── agents/        # Orchestration + APScheduler
│   │   │   ├── ai/            # LLM calls (insights.py, anomalies.py, digest.py)
│   │   │   ├── finance/       # recurring.py, budget_alerts.py
│   │   │   ├── chat/          # Streaming chat + tools
│   │   │   ├── rag/           # Retrieval + embeddings
│   │   │   └── vault_sync/    # VaultWatcher + VaultWriteGuard
│   │   ├── models/            # SQLModel schemas
│   │   ├── core/              # Config, deps, middleware, rate limiting
│   │   └── main.py            # FastAPI factory + lifespan
│   ├── alembic/               # Migrations
│   ├── seed_dummy_data.py     # Dev DB seeding
│   ├── seed_finance_real_data.py
│   └── data_finance_2026.json
│
├── ledgr-ui/                  # @ledgr/ui component library (local package)
├── docker-compose.yml
├── CLAUDE.md                  # This file — source of truth for architecture + conventions
├── .env                       # Secrets (never commit)
├── .env.example
├── run.sh
└── setup.sh
```

---

## Conventions

### Backend

- **Async first**: all I/O async (DB, HTTP, file ops)
- **Error handling**: FastAPI `HTTPException` with correct status; log with `logger`
- **Secrets**: `get_settings()` from `app.core.config`; never hardcode
- **DB**: SQLModel schemas; async queries with `async with engine.begin() as conn`
- **SaaS rule**: every user-data table needs `user_id UUID FK → users.id`; queries filter by authenticated user

### Frontend

- **No magic numbers**: every spacing/color/radius traces to a theme token
- **No Tailwind classes**: Tailwind is removed — any `className` on SC components is a CSS selector hook
- **No `any` types**: TypeScript strict — use proper interfaces
- **Modals**: always use `@ledgr/ui Dialog`; never roll custom overlay/backdrop/portal
- **Forms**: React Hook Form + Zod; validate at submit
- **React Query**: always set `staleTime` on queries that don't need to refetch on every render

### UI/UX rules (always apply)

- **Sidebar**: top-level links only — no accordions, no sub-menus
- **AreaTabs**: always `<AreaTabs>` from `@/components/ui/AreaTabs`; never nest `<Tabs>`
- **No page-level titles** rendered inside content — breadcrumbs only in TopBar
- **Dashboard layout**: two-column shell, right column 300px fixed, left `1fr`
- **Density**: compact text (13–14px body), tight padding (16–20px on cards), no oversized bold values
- **Agents page**: dense table pattern — status, schedule, last-run, actions columns
- **Action-Rail**: inputs/forms always in right WorkspaceLayout rail; data/analytics in center
- **No pill/capsule shapes anywhere** — buttons, inputs, toggles, badges, progress bars all use `theme.radii.sm`/`md` (flat, ~8–10px corners), never `9999px`/`theme.radii.full`. Exception: true circles (avatars, status dots, the `Switch` track/thumb) where the shape is structural, not a corner-rounding choice. When adding any new rounded element, reference a `theme.radii.*` token — never hardcode a radius value.
- **Multi-option toggle/filter style (user-confirmed favorite, always use this for "All / Over / Near / On track"-style filters)**: `@ledgr/ui`'s `SegmentedControl` — light `theme.color.muted` track, white/card active segment with `theme.shadow.xs`, `theme.radii.md` corners (not pill-shaped). Do NOT use a `Select` dropdown for this pattern unless the option list is long (5+) or doesn't need every option visible at once — short status/range filters (≤4 options) should be `SegmentedControl`, not a dropdown.
- **`PageHeader` (ledgr-ui)**: `Subtitle` is hidden below the `md` breakpoint (768px) to avoid cluttering mobile/narrow views — don't rely on subtitle text being visible on small screens. `Root` wraps (`flex-wrap: wrap`) so `Actions` drops to its own row instead of squeezing `Left` when there are many header buttons.
- **`PageHeader` actions vs `AreaToolbar` — where controls live**: `PageHeader`'s `actions` slot (top-right, next to the title) is reserved for page-level, tab-independent actions only — in practice, just the **Settings** gear button. Everything tab/view-specific (view switcher, date nav, search, filters, import, "Add X" button) belongs together in a single `<AreaToolbar>` rendered as the first child inside the tab's content (i.e. between the `AreaTabs` row and the content `Card`), not split into `HeaderActionPortal`. Never render a literally empty or title-only toolbar (no real controls) — but a toolbar holding real multi-control UI should stay as a dedicated `AreaToolbar`, not get merged into the header.
- **WorkspaceLayout's `Main` is a flex column with `gap: 24px`** — direct children (grids, sections) must NOT also set their own `margin-top`, or spacing doubles (gap + margin-top stack additively). Let the parent `gap` handle inter-section spacing.

---

## Critical Gotchas

- **No Docker `--reload`**: any Python change → `docker compose restart backend`
- **Alembic autogenerate** tries to DROP `captures` table — always review, strip unrelated drops
- **Recharts animation**: add `isAnimationActive={false}` to every `<Pie>/<Bar>/<Area>/<Line>` — default animation leaves shapes empty in headless/preview environments
- **VaultWriteGuard**: all vault writes validated against `ALLOWED_WRITE_PATHS`; never bypass
- **pgvector**: Docker image must be `pgvector/pgvector:pg15`
- **Push notifications gotcha**: `docker compose restart` does NOT re-read `env_file` — use `docker compose up -d backend` after `.env` changes
- **health_logs entry_type CHECK**: allowed values are `gym,weight,food,meal,water,steps,body_fat,sleep,note` — adding a new type needs a migration to update the Postgres CHECK constraint
- **CSS vars are HEX**: never `hsl(var(--x))` — use `var(--x)` or `color-mix()`
- **`@ledgr/ui` Dialog fires `onOpenChange` on CLOSE only** (Esc/overlay/close-button → `onOpenChange(false)`); it never calls `onOpenChange(true)`. So modal **reset/prefill must be driven by a `useEffect` on `[open, editing]`**, not an `onOpenChange(true)` branch (that branch never runs → stale/empty forms on reopen/edit). Same for any controlled Dialog.
- **Number `<Input>` needs `step`**: `min="0.01"` (or any non-integer min) with the default `step="1"` makes whole numbers *invalid* ("nearest valid values are 19.01 and 20.01"). Always pair a decimal `min` with `step="0.01"` (or `step="any"`) on currency/amount inputs.
- **Finance categories are a 2-level DB tree, separated by `kind` (income vs expense)** — no hardcoded category lists. Query key `['finance', 'categories']`; `GET /categories?kind=` filters; the tree auto-seeds defaults per kind on first fetch (`_DEFAULT_CATEGORIES`). The txn form uses `CategoryPicker` (a cascading flyout on desktop / drill-down on mobile, with inline create). **Transactions store `category_id`** (FK to the exact node) **plus a denormalized `category`/`source` = the TOP-LEVEL ancestor name** (so existing by-category reports roll up for free; resolve `category_id` for the subcategory). Resolve via `_resolve_category()` in `api/areas/finance.py`. Deleting a category uncategorizes its transactions. **Account is required** on manual expense/income (422 without it).
- **Finance `logged_at` columns are `TIMESTAMP WITHOUT TIME ZONE`** — asyncpg rejects a tz-aware datetime with `DataError: can't subtract offset-naive and offset-aware`. `api/areas/finance.py` normalizes every `logged_at` via the `NaiveDateTime` annotated type (`AfterValidator(_to_naive_utc)`). Any new datetime field mapping to one of these columns must use it. **Frontend must send a NAIVE LOCAL datetime, not `toISOString()`** — `dayjs(date).toISOString()` converts the picked local-midnight to UTC, which shifts the date back a day for users east of UTC (IST midnight → previous-day 18:30 UTC), so the txn renders on the wrong day. Send `dayjs(date).format('YYYY-MM-DD') + 'T' + dayjs().format('HH:mm:ss')` (naive local).
- **Pending migration chain** (not yet applied if Docker was down): `c7d2e9f1a3b4` (splits/tags) → `d8e3f0a2b5c6` (habits) → `e9f4a1b3c6d7` (workouts) → `f0a5b2c4d7e8` (foods). Run `alembic upgrade head` to apply.
- **Audit + CMS migration chain** (2026-06-22, single linear head): `h006` (is_admin) → `h007` (oauth_states.user_id) → `h008` (per-user composite uniques) → `h009` (content CMS expansion). Run `alembic upgrade head` to apply.

---

## Commands

```bash
# Frontend
cd frontend
pnpm dev              # Vite dev server :5173
pnpm build            # Production build
pnpm lint

# Backend (local, not Docker)
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# Docker (preferred)
docker compose up -d          # Start all services
docker compose restart backend  # After any Python edit
docker compose exec backend alembic upgrade head
docker compose exec backend pytest

# Migrations
cd backend
alembic revision --autogenerate -m "description"
alembic upgrade head
```

---

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
- **⌘K Command Bar 2.0 done:** GlobalCapture UNMOUNTED from AppShell — its duplicate ⌘L listener cancelled the palette's (⌘L was dead); palette owns nav + `>`/numeric log mode (parse → confirm card, verified) + `?` ask mode which hands off to Chat via `sessionStorage['aios.chat.prefill']` (ChatPage reads it with deferred removal — **StrictMode double-mount consumes one-shot storage keys**, defer cleanup ~1.5s). The old fake hardcoded ask answer is gone; `/chat` route bug → `/app/chat`.
- **New Critical Gotcha:** after bumping/rebuilding ledgr-ui, `rm -rf node_modules && pnpm install` is NOT enough for the dev server — **also `rm -rf node_modules/.vite`** (or the optimizeDeps cache serves the old bundle and new exports crash the app at runtime while tsc stays green).
- Verified: tsc + `pnpm build` clean, zero console errors; pulse/forecast/automations endpoints curl-tested; briefing/synergy/forecast/automation jobs run manually; Dashboard/Settings/palette/Chat-handoff walked in preview. Remaining nice-to-haves in plan §12 backlog row (chat tool-rows, agents drawer, Highcharts swap, contrast script, email channel).

## Recent Updates (2026-07-04)

### R1–R5 landed (Gemini implementation + Claude validation/fix pass)
- **New surfaces:** Goals (`/app/goals`), Weekly Review (`/app/review`), Discoveries (`/app/discoveries`) + sidebar nav; Dashboard gained LifeHeatmap (real data via `GET /api/insights/heatmap`), DiscoveriesFeed, ActionCenterStrip. New backend: `api/insights.py` (briefing/discoveries/heatmap), `api/automations.py`, `services/insights/{briefing,synergy}.py` + APScheduler jobs (`insights_briefing` */15min tz-aware, `insights_synergy` 03:00 UTC). Migrations through `ecd685e0986e` applied. ledgr-ui **0.1.13** (InsightCard, Sparkline, PageHeader mobile overflow menu).
- **Both LLM sites metered** (`ai_allowed` + `record_ai_usage`, sources `briefing`/`synergy`) with facts-only fallbacks; briefing honors `deliver_at`+`tz` (zoneinfo) and is idempotent per (user, date).
- **Backend currently runs LOCALLY, not Docker**: uvicorn on **:8001** (Vite proxies `/api`→127.0.0.1:8001), no `--reload` → kill + relaunch after Python edits. **:8000 is a DIFFERENT project (Ledgr CA-desk)** — never assume it's AIOS.
- **Gemini-code review gotchas (recur on any AI-generated code):** literal `\"\"\"` escaped docstrings (SyntaxError — backend won't boot); Tailwind classNames on new pages (Tailwind is removed → renders unstyled; rewrite in styled-components); mock/random data left in "wired" components; Radix idioms (`asChild`/`iconOnly`/`sideOffset`) passed to ledgr-ui's own Popover/Button (breaks tsup DTS build); missing `user_id` scoping/metering. Grep for all of these when validating generated code.
- Remaining tail tracked in `docs/WORLD_CLASS_REDESIGN_PLAN.md` §12 (⬜ row): Dashboard briefing hero, Settings Briefing/Automations UI, automation trigger engine, Pulse Row, Command Bar 2.0, forecast scheduler job.

## Recent Updates (2026-07-03)

### UI/UX audit + R0.1 polish pass + WORLD-CLASS master plan
- **`docs/WORLD_CLASS_REDESIGN_PLAN.md` is now the forward source of truth** for UI/UX redesign + AI features (Briefing, Synergy Engine, ⌘K Command Bar 2.0, Action Center, Life Heatmap, Weekly Review, Forecasts, automation templates). Phases R0–R5 with per-task files + verify steps; §12 status ledger must be updated every session.
- **R0.1 shipped:** 12 pill-radius (`999px`) sites → `theme.radii.sm/md` across 8 files (OverviewInsightCard, GreetingHero, RelevantCards, TodaysTimeline, AgentsPage, GuideOverview, PipelineTab, CategoryManager); Transactions view switcher Select → `SegmentedControl size="sm"`; `formatCurrency` negative → `-₹5.94L`; Health "1 days" pluralized; stale "Use the rail" empty-state copy fixed (BodySleepTab/NutritionTab); Finance HomeTab fixed-380px cards → `AnalyticsCell` (auto-height on mobile); Phase-5 WIP `@/components/ui/card`→`ui/Card` casing fix.
- **New Critical Gotcha — `KpiGrid` (ledgr-ui ≥0.1.9):** `overflow-x: auto` makes overflow-y computed `auto`, so inside a height-constrained flex column the grid silently shrank and vertically clipped KPI values (Health Body & Sleep showed label-only 66px cards). Fixed with `flex-shrink: 0` on `KpiGrid`. Also: after a ledgr-ui reinstall the running Vite dev server keeps serving the OLD optimized dep from memory — **restart the dev server** after `pnpm install`, and note `rm -rf node_modules/@ledgr && pnpm install --force` does NOT re-copy (full `rm -rf node_modules && pnpm install` does).
- **`theme.radii.xs` exists at runtime (aiosTheme) but not in the ledgr-ui radii TS type** — using it fails tsc; use `sm` or extend the type (plan §3.1).

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
- **Chat was completely broken in production.** `services/chat/agent.py` and `services/chat/nvidia_agent.py` (NVIDIA is the **default** provider) called `reserve_budget`/`get_token_budget_status`/`record_usage` with the wrong arg count/order (missing `user_id`) — every chat message crashed on both providers. Fixed by threading `user_id` through `stream_chat_response`/`stream_nvidia_chat_response`/`execute_tool`. Also fixed: `get_calendar_events` tool called `get_stored_events` with wrong arg order; chat WS never enforced `ai_allowed()`/AI quota before streaming (now checked before processing each message).
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

### Three security/quality audit rounds (all pushed to `claude/aios-web-audits-jywmwh`, PR #1)
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

