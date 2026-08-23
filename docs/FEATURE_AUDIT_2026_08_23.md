# Feature Audit & Product Pressure-Test — 2026-08-23

**Scope:** every user-facing feature, judged as a *product decision* rather than as code.
Which ideas are good, which are bad, which need work, which should be deleted.
**Companion doc:** `SHIPMENT_READINESS_2026_08_23.md` (go/no-go and blockers).
**Predecessor:** `AUDIT_2026_08_16.md` audited *code quality*. This one audits *the product*.
It does not re-derive those findings; where they overlap, this file links rather than repeats.

**Method.** Every claim below was traced from the route or component that renders it
back to the data that feeds it — call-site greps, not documentation. Where a feature is
called dead, the evidence is a zero-result search over `frontend/apps` **and**
`frontend/packages`, quoted inline. Gates were re-run on this branch (results in the
companion doc).

**Measured baseline (2026-08-23):** 53,499 lines frontend TS/TSX · 21,172 lines backend
Python · 244 backend routes · ~38 addressable screens (31 nav destinations + 7 settings
tabs) · 12 always-on scheduled jobs + 7 per-user agents.

---

## Verdict in one paragraph

The engineering is better than the product. The isolation backbone, the money handling
and the Gmail→ledger ingestion pipeline are genuinely good, and all seven gates are
green. But **the feature that the roadmap names as the entire reason to pay — the
cross-domain Synergy Engine — has no user interface at all.** It computes nightly, meters
AI credits, writes to a table, and no screen in the application reads it. The same is true
of the activity heatmap, the forecasting engine and the what-if simulator. Meanwhile the
app has grown 38 screens of per-domain CRUD, which is exactly the "feature parity with
Monarch/Whoop/Notion" that `PRODUCT_ROADMAP.md` §5 explicitly warns against. **The product
built the commodity half and shipped the differentiated half into a table nobody queries.**
That is the single most important thing on this page, and it is a few days of work to fix,
not a rewrite.

---

## Part 1 — Pressure-testing the thesis

`PRODUCT_ROADMAP.md` states the thesis plainly:

> Control Tower does not win by being a better budget app. It wins on
> cross-domain intelligence… **That insight is the product. Everything else
> (logging, dashboards, agents) exists to feed the engine that produces it.**

Held against the code, that sentence is currently false in both directions.

| Roadmap claim | Reality in code | Verdict |
|---|---|---|
| The insight *is* the product | `insightsApi.discoveries` — **0 call sites** | ❌ not shipped |
| 👍/👎 tunes the engine | `insightsApi.feedback` — **0 call sites** | ❌ unreachable |
| Heatmap drives the logging habit | `insightsApi.heatmap` — **0 call sites** | ❌ not shipped |
| Briefing is the daily hook | rendered only inside `/app/review`, not on the dashboard | ⚠️ buried |
| "Everything else exists to feed the engine" | 19 of 31 destinations are per-domain CRUD | ❌ inverted |

### 1.1 🔴 The moat is built and invisible

`backend/app/services/insights/synergy.py` is 202 lines of real work: Pearson correlation
over a 45-day window, lag-0 and lag-1 pairs across spend/gym/sleep/captures, a minimum
sample size of 21, a 14-day dedupe per metric pair, metered LLM phrasing with a
deterministic fallback, and an adaptive threshold that raises |r| from 0.6 to 0.7 when a
user's recent 👎 rate exceeds 40%. It runs nightly at 03:00 UTC for every user
(`scheduler.py`, job `insights_synergy`). It writes `Insight` rows. It spends AI credits
(`record_ai_usage(..., "synergy")`).

Nothing renders it.

```
$ grep -rn "insightsApi\.[a-zA-Z]*" frontend --include=*.tsx --include=*.ts \
    | grep -v "packages/shared/src/api/insights.ts"
…/settings/sections/NotificationsModules.tsx:46:    queryFn: insightsApi.briefingPreferences,
…/settings/sections/NotificationsModules.tsx:54:    mutationFn: insightsApi.updateBriefingPreferences,
…/pages/ReviewPage.tsx:82:                       queryFn: insightsApi.briefingToday,
```

Three call sites. `discoveries`, `feedback` and `heatmap` are not among them.

**How it happened.** `DashboardPage.tsx:7-11` documents it in its own header comment: the
2026-08-02 canvas redesign replaced a two-column dashboard that carried `BriefingCard`,
`OverviewInsightCard`, `DiscoveriesFeed` and the calendar rail, because "the canvas draws
none of them". The components were left in the repo unreferenced "since the data behind
them (the daily brief, synergy discoveries) is still produced." A visual-fidelity pass to a
design canvas silently deleted the product's differentiator, and nothing caught it because
no gate tests reachability.

**Second-order damage.** The adaptive threshold in `_get_threshold()` requires ≥10 rows of
recorded feedback before it can raise the bar. Feedback can never be recorded, because the
control that records it does not exist. So the anti-slop guardrail — the roadmap's stated
defence against the "one absurd insight destroys trust" risk — is permanently inert. The
north-star guardrail metric ("Insight usefulness rate > 60% positive") is **unmeasurable by
construction**.

**Verdict: 🔴 FIX FIRST — nothing else on this page matters as much.** Re-mount
`DiscoveriesFeed` (with the 👍/👎 control wired to `insightsApi.feedback`) and the heatmap
on `/app`. The components still exist in the tree. This is the highest
value-per-hour work available in the repository.

### 1.2 🟠 The guard that should have caught this cannot

`backend/tests/test_api_mappings.py` is the orphan detector. `get_frontend_endpoints()`
walks every `.ts`/`.tsx` under `frontend/apps/*/src` and `frontend/packages/shared/src`
and regex-matches path strings. **An `api/*.ts` module with zero importers still satisfies
it** — the path string is present in the file, so the route counts as "mapped".

That is why `/insights/discoveries`, `/insights/heatmap` and all of `forecasts.ts`
scan green while being unreachable by any user. The test proves *a path string exists in
the source tree*, not *a user can reach the feature*.

**Verdict: 🟠 IMPROVE.** Add a second assertion: every exported `*Api` object member must
have at least one importer outside its own `api/` module. Cheap, static, and it would have
caught all four orphans in this document on the day they were created.

---

## Part 2 — Feature-by-feature verdicts

Legend: **✅ KEEP** (good, ship as-is) · **🟡 IMPROVE** (good idea, weak execution) ·
**🔴 FIX** (broken or dishonest promise) · **⚫ DELETE** (cost exceeds value) ·
**🔵 DECIDE** (needs a product call, not an engineering one)

### 2.1 Finance

| Feature | Verdict | Why |
|---|---|---|
| **Gmail → parse → review inbox → ledger** | ✅ **KEEP — best feature in the app** | Genuinely differentiated. Deterministic parsers over curated Indian bank/UPI senders, idempotent `dedupe_key`, reconciliation against the ledger ±3d, review-first with opt-in timed auto-commit, and skip-if-empty so no LLM burns on an empty inbox. This is the thing no competitor does for Indian banking. |
| Month-end payables checklist | ✅ KEEP | Concrete, unglamorous, high-utility. Real per-month paid/unpaid state. |
| Auto-categorisation rules | ✅ KEEP | Direct multiplier on the ingestion pipeline. |
| Transactions / accounts / budgets / bills / investments | 🟡 IMPROVE | Solid CRUD, `Decimal` + row locks, correct. But it is table stakes — this is where the surface-area problem lives (60 of 244 routes). Freeze it; do not deepen it. |
| Loan payoff planner | ✅ KEEP | Client-side simulation, no backend cost, genuinely useful. |
| **What-If Simulator** | ⚫ **DELETE** | `POST /areas/finance/simulate` + a 400-run Monte-Carlo service + `financeApi.simulate` in `areas.ts` — and **zero callers** (`grep -rn "\.simulate(" frontend` → no results). The UI (`SimulatorTab`) was deleted in the 2026-08-02 redesign; the backend was never retired. Either re-site it or delete route + service + api method. |
| Financial-health score | 🔵 DECIDE | Flagged unowned since 2026-08-02. Still no caller, still no decision. |

### 2.2 Health

| Feature | Verdict | Why |
|---|---|---|
| Workouts / nutrition / body / sleep / habits | 🟡 IMPROVE | Real CRUD, all manual entry. Five destinations is a lot of nav for hand-logging. |
| **Google Fit sync** | 🔴 **FIX — broken promise** | `FEATURES.md` advertises it. `google_sync` runs every 30 min and writes `google_fit_metrics`. But **`backend/app/api/areas/health.py` never reads that table** — `grep -rn "GoogleFitMetric" backend/app` outside `models/` returns only the writer, the agent context builder, and `/integrations/{provider}/test`. A user connects Google Fit, the UI says "connected", and their steps and weight never appear on Body metrics. The data lands in a table the Health area does not query. |
| Habit tracker | ✅ KEEP | Cheap, drives the daily-logging metric the roadmap cares about. |

### 2.3 Career

| Feature | Verdict | Why |
|---|---|---|
| Journal · Skills · Learning · Experience · Opportunities | 🟡 IMPROVE | Five nav destinations, all manual text entry, no automation and no cross-domain feed-in. Career is the thinnest area carrying the most nav weight. **Recommend collapsing 5 → 2** (Journal+Experience, Skills+Learning+Opportunities) until something automates it. |

### 2.4 Dashboard / Daily

| Feature | Verdict | Why |
|---|---|---|
| Today (KPI tiles, focus, 12-week heat) | 🟡 IMPROVE | Reads real data with proper inline error handling (good — the 08-16 fix stopped it printing ₹0 as fact). But it is a summary of CRUD, not an insight surface. It is where §1.1 must land. |
| **Dashboard "Schedule"** | 🔴 **FIX or DELETE** | Backed by `dayEventsStore` — `zustand/persist` into **localStorage**. Events never reach the server, never sync across devices, and vanish when the user clears their cache. This is on the app's front door. Either persist it (the `plan_blocks` table already exists) or remove it. |
| **Three competing calendars** | 🔴 FIX | `dayEventsStore` (local-only), workspace `plan-blocks` (server), and Google Calendar sync (server) are three unreconciled models of "what is on my day". Pick one. |
| This week (plan blocks + gcal) | ✅ KEEP | Server-backed, real gcal join. This is the calendar model to standardise on. |
| Weekly review | ✅ KEEP | Guided flow that *writes* (goal progress + focus captures). Genuinely the strongest engagement surface in the app — and currently the **only** place the daily briefing is visible. |

### 2.5 AI & agents

| Feature | Verdict | Why |
|---|---|---|
| **Synergy Engine** | 🔴 **FIX — see §1.1** | Built, running, invisible. |
| Chat assistant | ✅ KEEP | Prompt caching verified at 95% prefix hit, tool-calling, per-user vault gating, model allowlist. Strong. |
| Agents (7 seeded, 4 active) | 🟡 IMPROVE | Small-model tier + dormancy skip is good cost discipline. But **`aios-vault-extractor` is active by default and does nothing on hosted** (see §2.7). Drop it from `_ACTIVE_BY_DEFAULT` when vault sync is off. |
| Daily briefing | 🟡 IMPROVE | Produced every 15 min, tz-aware, idempotent — and reachable only by navigating to Weekly Review. Put it back on `/app`. |
| **Forecasting engine** | ⚫ **DELETE or SURFACE** | `forecasts_nightly` runs at 02:30 UTC for every user and writes forecast rows. `forecastsApi` is defined in `packages/shared/src/api/forecasts.ts` and has **zero importers**. Nightly compute and DB writes for output no human can see. |
| **Automation engine** | 🟡 IMPROVE | 5 templates exist; **4 are unreachable**. `PayablesTab` exposes only `bill_reminder_3d`; `NotificationsModules` filters the rules list through a `RULE_LABELS` map that knows only `budget_80_push`. `streak_save_evening`, `weekly_review_sunday`, `payday_snapshot` and `idle_goal_nudge_7d` can never be enabled by a user. Ship a rules screen or delete the four. |
| **Saved quotes** | ⚫ **DELETE** | 7 routes + `saved_quotes` table + user data, zero consumers since an earlier redesign. Flagged "pending a product decision" on 2026-08-17 with an explicit "do not leave this entry here forever". It is still here. **Make the call: retire the router and the table.** |

### 2.6 Workspace

| Feature | Verdict | Why |
|---|---|---|
| Projects · Sprints · Tasks | 🟡 IMPROVE | Real cross-domain CRUD. But **"Sprints" is a software-team concept in a personal life OS** — it is the clearest instance of building for the developer rather than the user. |
| Goals · Milestones | ✅ KEEP | Correctly centralised out of the areas (2026-08-02). `progress_score` wiring is sound. Goals are the natural anchor for cross-domain insight. |
| 5 workspace destinations | 🔵 DECIDE | Five top-level rows for one person's to-do list. Recommend 5 → 3. |

### 2.7 Platform & SaaS

| Feature | Verdict | Why |
|---|---|---|
| Multi-tenant isolation | ✅ KEEP | Grade A in the 08-16 audit, verified by live cross-tenant attack. The backbone is real. |
| **Onboarding (`WelcomeWizard`)** | 🔴 **FIX — it is a carousel, not onboarding** | Four slides of marketing copy with no actions. `finishOnboarding()` contains a **commented-out** API call (`// await api.post('/auth/me', { onboarded: true })`), so completion is never recorded server-side. It is gated on `localStorage.getItem("ct_onboarded")`, so it re-shows on every new device, browser and incognito window. The roadmap's Phase 1 exit criterion — "pick domains → connect a bank/Google → log first entry → see first dashboard", with completion as **the activation event** — does not exist, and activation is therefore unmeasurable. |
| **Data export** | 🔴 **FIX — missing** | Account deletion exists (`DELETE /auth/me`). There is **no export endpoint anywhere** in 244 routes. `PRODUCT_ROADMAP.md` §4 names "export or delete everything in one click" as the trust feature for a product holding finance *and* health data. Half of it is built. |
| **Vault sync** | 🔵 **DECIDE — hosted dead weight** | Single-tenant by design; `.env.prod.example` ships `VAULT_SYNC_ENABLED=false`. For every hosted user this makes the vault monthly summary, the vault CSV backup, the chat vault tools and the default-active Vault Extractor agent inert. It is a genuinely good *self-host* feature and pure carrying cost on the hosted product. Decide: self-host-only feature flag, or per-user vault roots. |
| Legacy `require_plan` | 🟡 IMPROVE | One surviving call site (`integrations.py:84`), redundant behind `require_module("integrations")` at `main.py:325`, and inert anyway because `service.py:282` sets `plan="pro"` on any module purchase. It keeps the whole legacy plan/addons machinery alive for nothing. |

### 2.8 Pricing

The model is **6 modules × $5, bundle $22** — but `computeMonthly()` caps the à-la-carte
total at the bundle price. So:

| Modules picked | Charged | Effective |
|---|---|---|
| 1–4 | $5–$20 | à la carte |
| **5** | **$22** (capped) | 5th module is $2 |
| **6** | **$22** (capped) | 6th module is **free** |

Nobody rationally buys 5. The configurator is a 6-option UI for what is really a
**2-tier product** ($5–20, or $22 for everything). `BUNDLE_PRICE` also still carries a
`NEEDS PRODUCT SIGN-OFF` comment from the 2026-07-21 catalog change.

Worse, **the free tier is Dashboard + 1 area** — and per §1.1 the dashboard's
differentiating widgets aren't rendered. So the free tier a prospect actually experiences
is a single-domain CRUD app with no insight, competing head-on with free Monarch and free
Apple Health. **The free tier currently demonstrates the commodity and hides the moat.**

**Verdict: 🔵 DECIDE.** Recommend collapsing to two visible tiers (Free · Everything $22),
keeping module granularity as an internal entitlement mechanism, and moving Discoveries
into the free tier as the acquisition hook.

---

## Part 3 — The delete list

Removing these reduces surface area, nightly compute and maintenance with **zero** user-visible loss,
because no user can currently see any of them.

| # | Item | Evidence | Action |
|---|---|---|---|
| 1 | Saved quotes | 7 routes, table, 0 consumers | Retire router + table (migration) |
| 2 | What-If Simulator | route + Monte-Carlo service + api method, 0 callers | Retire, or re-site in Finance |
| 3 | Forecast engine | nightly 02:30 job, `forecastsApi` 0 importers | Retire, or surface on Goals |
| 4 | 4 unreachable automation templates | `TEMPLATES` has 5, UI exposes 1 | Ship a rules screen, or delete 4 |
| 5 | Legacy `plan`/`addons` columns + `require_plan` | 1 redundant call site | Drop after billing verification |
| 6 | `SimulatorTab`-era dead components | `BriefingCard`/`DiscoveriesFeed` are **not** in this list — re-mount them | — |

**Do not delete** `DiscoveriesFeed`, `LifeHeatmap` or `BriefingCard`. They are unreferenced
for the same mechanical reason, but they are the fix for §1.1, not candidates for removal.

---

## Part 4 — What is genuinely good

Stated plainly, because an audit that only lists problems misrepresents the codebase:

1. **The Gmail→ledger pipeline.** Real automation, real dedupe, real cost control. Ship the product around this.
2. **Multi-tenant isolation.** Grade A, attack-verified. Most solo SaaS never gets here.
3. **Money handling.** `Decimal` throughout, `with_for_update()` row locks, no float drift.
4. **Config guards.** 8 production guards, tested both ways. Production refuses to boot on cleartext HTTP. Well above average discipline.
5. **AI cost engineering.** Small-model tier for agents, dormancy skip, skip-if-empty ingestion, 95%-verified prompt-cache hit rate. Someone thought hard about unit economics.
6. **Navigation as a single source of truth.** One tree, every destination a real URL, ⌘K derived from it. The 08-05 restructure was correct.
7. **The audit culture itself.** `AUDIT_2026_08_16.md` corrects its own findings mid-flight and refuses to claim unverified browser work. That habit is why this audit had solid ground to stand on.

---

## Part 5 — Recommended sequence

Ordered by value per hour, not by difficulty.

**Week 1 — make the moat visible (the whole ballgame)**
1. Re-mount `DiscoveriesFeed` on `/app` with 👍/👎 wired to `insightsApi.feedback`.
2. Re-mount the heatmap; re-mount `BriefingCard`.
3. Add the reachability assertion to `test_api_mappings` so this cannot recur.
4. Fix or remove the localStorage Schedule.

**Week 2 — stop lying to users**
5. Join `google_fit_metrics` into the Health Body/Sleep pages, or pull the claim from `FEATURES.md`.
6. Replace the wizard with real onboarding: pick area → connect Gmail/Google → log one entry. Persist completion server-side.
7. Ship data export.

**Week 3 — cut**
8. Execute the Part 3 delete list.
9. Collapse Career 5→2 and Workspace 5→3.
10. Make the pricing call.

**Explicitly deferred:** deepening any per-domain CRUD. The app does not need more Finance
features. It needs the six screens it already computes.
