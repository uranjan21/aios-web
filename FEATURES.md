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
* ⚠️ **Google Fit sync is connect-only.** The 30-minute `google_sync` job writes
  `google_fit_metrics`, but the Health area does not read that table — synced steps and
  weight do **not** appear on any Health screen. The data is currently visible only to the
  Health Coach agent. Tracked as R5 in `SHIPMENT_READINESS_2026_08_23.md`.

## 3. Career 💼

* **Journal.** Milestones, daily notes and reflections, with a logging streak.
* **Skills inventory.** Levels including `day_0`, which drives the learning queue.
* **Learning.** Resources linked to the `day_0` skills they close.
* **Experience** and **Opportunities.** Roles held; pipeline for applications and prospects.
* All Career data is manual entry — nothing feeds it automatically.

## 4. Workspace 🗂️

* **Projects · Sprints · Tasks.** Cross-domain, with domain tagging, priorities and
  server-enforced consistency (a task inherits its project's domain and sprint).
* **Goals · Milestones.** Set here for every domain — areas show read-only progress only.
  `GET /api/goals` returns the latest weekly `progress_score`.
* **Savings pots.** Finance's ₹ target/current pots at `/app/workspace/goals?domain=finance`.

## 5. Daily 📅

* **Today.** Greeting, four KPI tiles, Today's Focus, and a 12-week activity heat grid.
* **This week.** Week planner over server-backed plan blocks, joined with Google Calendar.
* **Weekly review.** A guided flow that *writes* — records goal progress and creates focus
  captures. Currently the only screen that surfaces the daily briefing.
* ⚠️ **The dashboard "Schedule" is browser-local.** It is backed by a `localStorage`
  store; entries never reach the server, never sync across devices, and are lost when the
  browser cache is cleared. Tracked as R4.

## 6. AI 🧠

* **Chat assistant.** Streaming, tool-calling, file attachments, session history, per-user
  model choice from a server-side allowlist, and prompt caching (verified 95% prefix hit).
  Vault tools are gated to the vault owner; every other tenant gets RAG-only knowledge.
* **Background agents.** 7 seeded per user, 4 active by default: Morning Brief, Monthly
  Finance, Health Coach, Vault Extractor — plus the two Gmail trackers, which auto-enable
  when Gmail is connected. Timezone-aware crons, small-model tier by default, and Morning
  Brief skips dormant days rather than burning a credit.
* **Daily briefing.** Generated per user at their local delivery time, idempotent per day.
  Reachable only via Weekly Review (see R1).
* **Quick capture (⌘L)** and the **⌘K command palette** with navigate / log / ask modes.
* **Per-user LLM configuration (BYOK).** Override the system provider and supply a personal
  key to bypass metering.
* **Knowledge sources.** Configure, sync and remove an external knowledge source for RAG.

## 7. Platform ⚙️

* **Multi-tenancy.** Row-level isolation on every user-data table, verified by live
  cross-tenant attack.
* **Auth.** JWT in an httpOnly `SameSite=Strict` cookie (`aios_token`), Google OAuth, email
  verification, password reset, token-version revocation.
* **Modular billing.** Pay-per-module Stripe integration with a free base tier and metered
  AI. **Currently disabled** — never exercised against live Stripe keys.
* **Account deletion.** One-click, cascades from live ORM metadata.
* **PWA + push notifications**, **design system** (@ledgr/ui, light/dark), **admin panel**.

---

## Built but NOT reachable by any user

Each of these computes on the server and has no screen. They are features on paper only.
Full evidence in `docs/FEATURE_AUDIT_2026_08_23.md`.

| Capability | State | Disposition |
|---|---|---|
| **Cross-domain Synergy Engine** | Nightly job, correlations, adaptive threshold, metered LLM phrasing. `insightsApi.discoveries` has **0 call sites**. | 🔴 **Surface it — this is the product's differentiator** |
| **Insight 👍/👎 feedback** | Endpoint live; `insightsApi.feedback` has **0 call sites**, so the anti-slop threshold can never adapt | 🔴 Ship with the feed |
| **Activity heatmap** | `insightsApi.heatmap` has **0 call sites** | 🔴 Re-mount on Today |
| **Forecast engine** | Nightly 02:30 job writes rows; `forecastsApi` has **0 importers** | ⚫ Surface or retire |
| **What-if simulator** | Route + Monte-Carlo service + api method, **0 callers** | ⚫ Retire or re-site |
| **4 of 5 automation templates** | `streak_save_evening`, `weekly_review_sunday`, `payday_snapshot`, `idle_goal_nudge_7d` cannot be enabled from any screen | 🟡 Rules screen, or delete |
| **Saved quotes** | 7 routes + table, **0 consumers** since an earlier redesign | ⚫ Retire router + table |
| **Data export** | **Does not exist.** Deletion ships without its counterpart | 🔴 Build |
| **Onboarding** | `WelcomeWizard` is a 4-slide carousel; completion is never persisted server-side | 🔴 Build real onboarding |

---

## Planned

1. **Make the moat visible** — Discoveries feed with feedback, heatmap and briefing on Today.
2. **Real onboarding** — pick area → connect Gmail/Google → log first entry, persisted as the activation event.
3. **Data export** — the missing half of the trust posture.
4. **Google Fit → Health screens** — close the loop on an advertised integration.
5. **Frictionless bank sync** — beyond email parsing.
6. **Voice-first capture** — push-to-talk, transcribed and NLP-routed.
7. **Household / multiplayer** — shared finance and tasks; health and career stay private.
