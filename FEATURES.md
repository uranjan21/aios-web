# Control Tower — Features

> **Accuracy contract.** This file states what a user can actually *reach in the running
> app*, not what exists in the codebase. A capability that computes on the server but has
> no screen is listed under **Built but not reachable**, never as a shipped feature.
> Verified against source on **2026-08-23** (`FEATURE_AUDIT_2026_08_23.md`).
>
> **History of drift.** On 2026-07-21 this file advertised a "Premium Animated Loader" and
> "business-specific dashboards" that existed in no form. Those were removed — but the file
> then kept full sections for the **Business** and **Content** areas, which were deleted the
> same day, for another two years of edits. Both sections are now gone. If you add a
> feature, add it here; if you delete one, delete it here.

---

## 1. Finance 💰

* **Email ingestion (the flagship).** Deterministic parsers read bank/credit-card alert
  emails from linked Gmail accounts (HDFC/Axis/ICICI/SBI/CRED, read-only) and queue
  transactions idempotently into a review Inbox. Manual "Sync emails" trigger plus a
  6-hourly poller. Skip-if-empty: no unparsed financial mail means no LLM call and no
  metered credit.
* **Statement reconciler.** Parses statement line items daily and reconciles against the
  ledger (±3 days, same amount) so alert-captured transactions are not double-queued.
* **Review inbox.** Approve/dismiss individually or in bulk; pre-filled category and
  account; opt-in timed auto-commit (off by default — review-first).
* **Auto-categorisation rules.** Merchant rules (contains/equals/regex) setting category
  and account on ingested transactions.
* **Transactions.** Income, expenses and transfers with hierarchical categories, CSV
  import, inline edit and bulk operations.
* **Accounts.** Multi-account balances with `Decimal` arithmetic and row-level locking.
* **Budgets · Bills · Investments · Loans.** Limits by category, month-end payables
  checklist (rent, subscriptions, EMIs, card bills with per-month paid/unpaid state),
  committed SIP vs actually invested, and a client-side loan payoff planner.
* **Vault summary & CSV backup.** Monthly finance summary written to the Obsidian vault
  plus a CSV backup of all finance tables. **Self-host only** — inert whenever
  `VAULT_SYNC_ENABLED=false`, which is the shipped production default.

## 2. Health 🏃

* **Workouts, nutrition, body metrics, sleep.** Manual logging with per-metric targets.
* **Habit tracker.** Daily checklist for recurring habits.
* **Google Fit sync.** `google_sync` writes `google_fit_metrics` every 30 minutes and
  Body metrics renders them as a read-only "Synced from Google Fit" card; the Steps tile
  falls back to Fit when nothing was hand-logged (a manual entry still wins). Read-only by
  construction — the next sync would overwrite an edit.

## 3. Career 💼

Two destinations since 2026-08-23 (was five; old paths redirect):

* **Journal.** Milestones, daily notes and reflections with a logging streak, plus the
  roles you have held.
* **Growth.** Skills inventory (levels including `day_0`), the learning resources that
  close those gaps, and the opportunity pipeline.
* All Career data is manual entry — nothing feeds it automatically.

## 4. Workspace 🗂️

* **Projects · Sprints · Tasks.** Cross-domain, with domain tagging, priorities and
  server-enforced consistency (a task inherits its project's domain and sprint).
* **Goals · Milestones.** Set here for every domain — areas show read-only progress only.
  `GET /api/goals` returns the latest weekly `progress_score`.
* **Savings pots.** Finance's ₹ target/current pots at `/app/workspace/goals?domain=finance`.

## 5. Daily 📅

* **Today.** Greeting, four KPI tiles, the daily brief, Today's Focus beside Schedule,
  **Discoveries** (the cross-domain correlations, with 👍/👎 that tunes the engine), and a
  12-week cross-domain activity heat with your logging streak.
* **This week.** Week planner over server-backed plan blocks, joined with Google Calendar.
* **Weekly review.** A guided flow that *writes* — records goal progress and creates focus
  captures. Currently the only screen that surfaces the daily briefing.
* **Schedule.** Server-backed plan blocks — the same rows `/app/week` writes — merged
  with today's Google Calendar events when Calendar is linked.

## 6. AI 🧠

* **Chat assistant.** Streaming, tool-calling, file attachments, session history, per-user
  model choice from a server-side allowlist, and prompt caching (verified 95% prefix hit).
  Vault tools are gated to the vault owner; every other tenant gets RAG-only knowledge.
* **Background agents.** 7 seeded per user, 4 active by default: Morning Brief, Monthly
  Finance, Health Coach, Vault Extractor — plus the two Gmail trackers, which auto-enable
  when Gmail is connected. Timezone-aware crons, small-model tier by default, and Morning
  Brief skips dormant days rather than burning a credit.
* **Daily briefing.** Generated per user at their local delivery time, idempotent per day.
  Rendered on Today and inside Weekly Review.
* **Cross-domain discoveries.** A nightly job correlates spend, sleep, workouts and
  captures over 45 days (minimum 21 samples, lag-0 and lag-1). Rating an insight tunes the
  engine: the required correlation tightens when a user's thumbs-down rate climbs.
* **Quick capture (⌘L)** and the **⌘K command palette** with navigate / log / ask modes.
* **Per-user LLM configuration (BYOK).** Override the system provider and supply a personal
  key to bypass metering.
* **Knowledge sources.** Configure, sync and remove an external knowledge source for RAG.

## 7. Platform ⚙️

* **Multi-tenancy.** Row-level isolation on every user-data table, verified by live
  cross-tenant attack.
* **Auth.** JWT in an httpOnly `SameSite=Strict` cookie (`aios_token`), Google OAuth, email
  verification, password reset, token-version revocation.
* **Onboarding.** Three steps that connect Gmail and teach ⌘L. Completion is recorded on
  the account (`users.onboarded_at`), so it follows the user rather than the browser.
* **Billing.** Two tiers — Free (Dashboard + one area) and Everything. Module granularity
  remains the entitlement mechanism underneath. **Currently disabled** — never exercised
  against live Stripe keys.
* **Data export and deletion.** Both one-click, both derived from live ORM metadata so they
  stay in step as tables are added. The export excludes credentials by column name.
* **PWA + push notifications**, **design system** (@ledgr/ui, light/dark), **admin panel**.

---

## Built but NOT reachable by any user

Most of this table is now empty — the 2026-08-23 remediation shipped the
surfaces or retired the code. What remains is tracked in
`backend/tests/test_api_mappings.py::ALLOWED_UNREACHABLE_MEMBERS`, where every
entry carries a reason and an id, and **a new member with no consumer fails CI**
(`test_api_members_are_reachable`).

| Capability | State |
|---|---|
| **Forecast engine** | Routes and service live; `POST /forecasts/generate` works on demand. The nightly job is **unregistered** — it wrote rows nothing read. Surface on Goals, or retire. `R6` |
| **Credit-card bill CRUD** | Four endpoints superseded by the payables checklist. `CC-1` |
| **Nutrition food library CRUD** | No surface for curating the food list. `NUT-1` |
| **Career generic events** | Superseded by the journal entry path. `CAR-1` |
| **Skill-gap analysis** | Lost its home when Career's Roadmap tab went. `CAR-2` |
| **Workout PRs · workspace stats** | Analyses with no card. `HLT-1`, `WS-1` |

**Retired 2026-08-23:** saved quotes (router, model and table dropped — migration
`u002`) and the What-If Simulator (route, Monte Carlo service, api method).

## Planned

1. **Give the user a reason to come back daily** — the Discoveries feed exists now;
   the open question is delivery (push/email) and whether the correlations are good
   enough to trust. The 👍/👎 rate is the instrument for answering that.
2. **Observability before public signup** — nothing currently tells you production broke.
3. **Restore-test a backup** — the off-box mechanism exists and has never been exercised.
4. **Sign off the chat pricing change** — long prompts now cost more than one credit.
   The rule is tested and named; whether it is the right rule is a product call.
5. **Frictionless bank sync** — beyond email parsing.
6. **Voice-first capture** — push-to-talk, transcribed and NLP-routed.
7. **Household / multiplayer** — shared finance and tasks; health and career stay private.
