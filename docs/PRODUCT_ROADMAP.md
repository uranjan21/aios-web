# AIOS Web — Product Vision & Roadmap

**Date:** 2026-06-21 · **Owner:** Utsav · **Horizon:** 6 months to credible paid launch

This document defines *what AIOS becomes* and *how it gets there*. It assumes the ship-blockers documented in `CLAUDE.md` § "ship-readiness audit" are fixed first — none of the growth work below matters while the app leaks tenant data and can't take a payment.

---

## 1. The thesis — why AIOS is worth paying for

Every category AIOS touches already has a great single-purpose app: Monarch/Copilot for money, Whoop/Apple Health for the body, Notion for work, Linear for tasks. **AIOS does not win by being a better budget app.** It wins on the one thing none of them can do:

> **Cross-domain intelligence — connecting your money, body, work, and content into a single model of your life, and surfacing the patterns no single-purpose app can see.**

"You complete 40% fewer tasks after nights under 6 hours of sleep." "Weeks you spend >₹3k on dining out, your weight trends up 0.4kg." That insight is the product. Everything else (logging, dashboards, agents) exists to feed the engine that produces it.

**Positioning:** *Personal Operating System — the AI command center for your whole life.* Premium, calm, editorial, single-user-first with household as the expansion.

---

## 2. North-star & guardrail metrics

| Metric | Why | Launch target |
|---|---|---|
| **Weekly Active Logging** (days/wk a user logs ≥1 entry in any domain) | The engine is worthless without data; this predicts retention | ≥ 4 days/wk for activated users |
| **Time-to-first-insight** | The "magic moment"; must happen in week 1 | < 7 days |
| **D30 retention** | SaaS survival | > 40% |
| **Free → paid conversion** | Monetization | > 5% |
| **Insight usefulness rate** (👍 on AI Discoveries) | Guardrail against AI slop | > 60% positive |

---

## 3. Roadmap — five phases

### Phase 0 — Make it shippable (Weeks 1–3) · *blocker work*
Close the audit. Nothing here is a feature; it's the cost of being a real SaaS.
- Fix C1–C5 (tenant isolation on chat, captures, push, integrations, vault).
- Fix H1–H4 (remove prod backdoor, `ENVIRONMENT=production`, Redis OAuth state, token revocation).
- Add **multi-tenant isolation test suite** — for every router, "user A cannot see user B's rows." Wire into CI as a merge gate.
- Fix the test harness (schema setup in conftest) so the suite actually runs.
- **Exit criteria:** isolation tests green in CI; pen-test of IDOR on every `/{id}` route passes; cookies `Secure` in prod.

### Phase 1 — Monetization & onboarding (Weeks 3–6) · *gate to charge*
You cannot sell a subscription without a way to subscribe.
- **Stripe Billing**: `subscriptions` table (`user_id`, `plan`, `status`, `current_period_end`, `stripe_customer_id`), Checkout, Customer Portal, webhook handler (idempotent), and a `require_plan("pro")` dependency for gating.
- **Plan design** (draft): **Free** (1 domain, 30-day history, manual entry) · **Pro ₹499/mo** (all domains, unlimited history, AI Discoveries, integrations, agents) · **Household ₹799/mo** (Pro + shared finance/tasks for 2). Annual = 2 months free.
- **Self-serve signup + onboarding**: signup screen (wire the existing `/auth/signup`), email verification, a 4-step onboarding (pick domains → connect a bank/Google → log first entry → see first dashboard). Onboarding completion is the activation event.
- **Exit criteria:** a stranger can sign up, hit the paywall, pay, and land in the app without you touching anything.

### Phase 2 — Engagement & retention (Weeks 6–10) · *make them come back*
From the existing SaaS plan — these are the daily-habit hooks.
- **Daily Executive Briefing** (push + email): yesterday's recap + today's outlook, LLM-summarized, per-user delivery time. (`BriefingPreference` table; APScheduler cron already exists.)
- **GitHub-style Life Heatmap + Streaks**: visual consistency of logging across domains; the dopamine loop that drives Weekly Active Logging.
- **Make agents real (M2)** or hide them. Wire the 8 scheduled agents to actually call the AI services (morning brief, finance snapshot, content performance) and write real output. Per-user seeding.
- **Exit criteria:** D7 retention measurably up vs. Phase 1 baseline; briefing open rate > 30%.

### Phase 3 — The moat: cross-domain Synergy Engine (Weeks 10–16) · *the reason to pay*
The headline differentiator. A nightly batch job that correlates domains and produces empathetic, human-readable insights.
- **Synergy Engine**: extract 30–90 days across finance/health/business → compute correlations (Pearson/rolling) → if signal is strong (e.g. |r| > 0.6 with enough samples), pass to the LLM to phrase it → store in an `insights` table.
- **AI Discoveries feed** on the dashboard with 👍/👎 (feeds the usefulness guardrail and tunes the threshold).
- **Frictionless finance via Plaid** (read-only bank sync + auto-categorization) — kills the #1 finance-app churn reason (manual entry) and feeds the engine richer data.
- **Rigor guardrails:** require a minimum sample size, correct for multiple comparisons, never imply causation, and always let the user dismiss/mute a pattern. One absurd insight destroys trust.
- **Exit criteria:** > 60% of insights rated useful; Pro users who see ≥1 insight retain measurably better.

### Phase 4 — Network effects: Household multiplayer (Weeks 16–24) · *growth & churn-lock*
Lock in couples/families; turn one account into two.
- `Household` + `HouseholdMember` tables; **shared** finance/tasks carry an optional `household_id`; **private** domains (health, career notes) stay strictly individual — no `household_id` column, ever.
- Row-level access: `WHERE user_id = X OR household_id IN (…)` for shared tables only.
- Invitation flow (signed JWT link → join on signup) + a Personal/Household context switcher in the TopBar + a joint dashboard.
- **Exit criteria:** invited partners convert; household accounts churn lower than solo.

---

## 4. "Award-worthy & premium" — the polish bar

Functionality gets you a product; these get you a product people screenshot and recommend.

- **One signature magic moment.** The AI Discoveries insight *is* the moment — invest in its copy, timing, and a beautiful reveal animation. This is what wins design awards and word-of-mouth.
- **Calm, editorial, fast.** Keep the Premium Black + Gold system. Enforce: every view has a real empty state (not a spinner-to-blank), optimistic updates on every mutation, skeletons that match final layout, and `prefers-reduced-motion` respected. Target < 200ms perceived interaction latency.
- **Trust as a feature.** A visible privacy posture: "your data is encrypted, never sold, never used to train models; export or delete everything in one click." For a life-OS holding finance + health, trust *is* the product. Ship a real DPA, data export (GDPR-style), and one-click account deletion.
- **Mobile-first capture, desktop-first review.** People log on their phone and reflect on a laptop. The PWA + ⌘L capture should feel native on mobile; the dashboards should feel like a cockpit on desktop.
- **Accessibility pass** (WCAG AA): focus rings everywhere, keyboard nav through every flow, contrast checked against the gold/black palette.

---

## 5. Risks & open decisions

| Risk / decision | Recommendation |
|---|---|
| **Vault sync vs. SaaS** — global FS doesn't fit multi-tenant | Decide now: per-user vault roots, or make vault a self-host-only feature and drop it from the hosted product. Don't ship it half-tenant. |
| **AI cost per user** — LLM calls on briefings + synergy + chat | Cap with per-user token budgets (already partially built), cache aggressively, and make the heaviest features Pro-only. |
| **Insight quality** — bad correlations destroy trust | Statistical guardrails + human 👍/👎 loop + conservative thresholds from day one. |
| **Scope creep across 5 domains** — each is a full app | Resist "feature parity with Monarch/Whoop/Notion." Compete on *connection between* domains, keep each domain "good enough," and let the engine be the star. |
| **Single-founder velocity** | Sequence ruthlessly: isolation → billing → one retention hook → the engine. Don't start Phase 4 before Phase 3 proves the moat. |

---

## 6. The one-line plan

**Fix the leaks → take a payment → build the daily habit → ship the cross-domain engine that no one else can → expand to households.** Everything in this doc serves that sentence, in that order.
