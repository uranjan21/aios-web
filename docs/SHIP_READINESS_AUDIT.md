# AIOS Web — Ship-Readiness Audit

**Date:** 2026-06-21
**Auditor:** Claude (Opus 4.8)
**Version audited:** 0.3.0
**Scope:** Full-stack review — backend security & multi-tenancy, API correctness, build health, monetization, test coverage. Frontend code reviewed for build health + wiring (not a pixel-level UX pass — that was covered by prior frontend audits).

---

## Verdict

> **Not ready to ship as a paid multi-tenant SaaS.** The product is feature-rich and the frontend is polished and type-clean, but the multi-tenant data-isolation work is **incomplete and partially broken**. Several flagship features (Integrations, ⌘L Quick Capture, AI Chat) are either non-functional at runtime or leak data across tenants. There is **no billing system**, so it cannot currently take a subscription at all.

`CLAUDE.md` claims *"Multi-Tenancy Enforced … updated all 178+ API queries."* This is **true for the five area routers** (finance, health, career, business, content — verified scoped to `current_user.id`) but **false for chat, captures, push, integrations, and vault sync**, which were left on the old single-user code path.

### Readiness scorecard

| Area | Status | Notes |
|---|---|---|
| Frontend build / types | 🟢 Good | `tsc --noEmit` = 0 errors; all pages real; lazy-loaded; error boundaries |
| Area data isolation (finance/health/career/business/content) | 🟢 Good | Queries correctly filter by `current_user.id` |
| Cross-tenant isolation (chat/captures/push/integrations/vault) | 🟢 Fixed | C1–C5 closed (see Fixes section). Vault descoped to self-host. |
| Integrations feature | 🟢 Fixed | Service signatures corrected, all reads user-scoped, `UNIQUE(user_id,provider)` |
| ⌘L Quick Capture | 🟢 Fixed | `user_id` set on insert; list scoped |
| AI Chat persistence | 🟢 Fixed | WS sets `user_id`; all session/message queries scoped + ownership-checked |
| Agents | 🟢 Fixed | Real LLM execution (runners.py); per-user seeding; per-user scheduler job ids; `UNIQUE(user_id,task_id)` |
| Auth security | 🟠 Improved | H1/H2/H5 fixed; H3 (Redis OAuth state) + H4 (token revocation) still open |
| Monetization | 🟢 Scaffolded | Stripe Checkout + Portal + webhook, Subscription model, Free/Pro/Household entitlements; needs keys/price IDs |
| Self-serve signup | 🟢 Fixed | Signup mode on `/login` + `/signup` route; Landing/Pricing CTAs wired; backend tests added |
| Test coverage | 🟠 Improving | Harness fixed + **11 multi-tenant isolation tests** added (23 passing); still 0 frontend tests |
| Observability / ops | 🟠 Thin | Logs only; no error tracking, metrics, or alerting |

Legend: 🟢 ship-ready / fixed · 🟠 needs work · 🔴 blocker

### Fixes applied — 2026-06-21 (this session)

All CRITICAL blockers and the code-level HIGH items are now resolved:

- **C5** — WS routes pass `user["sub"]`; `sync/chat/agents` handlers scope events per user. ([main.py](../backend/app/main.py))
- **C2** — chat list/get/delete/patch filter by `user_id`; WS sets `user_id` on inserts + verifies session ownership. ([chat.py](../backend/app/api/chat.py))
- **C3** — captures set `user_id` on insert + scope the list. ([captures.py](../backend/app/api/captures.py))
- **C1** — integrations: fixed all service-call signatures, user-scoped every read/delete, `provider` → `UNIQUE(user_id, provider)` (migration `h002`). ([integrations.py](../backend/app/api/integrations.py))
- **C4** — vault descoped from the hosted SaaS behind `VAULT_SYNC_ENABLED` (default off in prod): router 404s, watcher skipped, `/ws/sync` closed, UI hidden via `/api/features`. Conflict reads also user-scoped.
- **push** — subscriptions set/scope `user_id`.
- **agents** — now real (per-user LLM runs over the user's own data, `services/agents/runners.py`), seeded per-user, scheduler job ids unique per `(user, task)`, `UNIQUE(user_id, task_id)` (migration `h003`). Also fixed a latent `_broadcast_agent(user_id, event)` signature mismatch that was crashing the digest/anomaly/budget/recurring jobs.
- **H1** — legacy env-credential login backdoor now ignored when `ENVIRONMENT=production`.
- **H2** — `ENVIRONMENT` documented in `.env.example` (gates Secure cookies + validation).
- **H5** — email-format + 8-char password validation on signup/change-password.

- **L1** — fixed the broken test harness (schema setup, cookie isolation, real login creds) and added **11 multi-tenant isolation tests** (`backend/tests/test_isolation.py`) covering chat, captures, integrations, agents, and the auth boundary. Also typed chat `session_id` path params as `uuid.UUID` (validation + cross-DB correctness).
- **M3** — self-serve signup UI: `LoginPage` now has a login/signup mode toggle (name + email + password, client + server validation, error surfacing), a `/signup` route, and the Landing/Pricing "Get Started" CTAs point to it. Added 4 backend signup tests (incl. end-to-end per-user agent seeding).
- **M1** — billing scaffold (Stripe): `Subscription` model + migration `h004`; billing service (Checkout, Customer Portal, signature-verified webhook); `require_plan()` entitlement dependency (no-op until billing enabled) applied to agent-trigger + integration-connect; Free/Pro/Household tiers + feature map; `/api/billing/*` router; free subscription seeded on signup; `/api/features` exposes billing flags. Frontend: `api/billing.ts`, Settings billing section (plan + upgrade/manage), Pricing Pro→Checkout, post-checkout success handling. `stripe` added to `pyproject.toml` (lazy-imported — app runs without it). **Functional once you set `STRIPE_SECRET_KEY` + price IDs and run `uv sync`.** Added 5 billing tests. Full backend suite **32 passing**; frontend production build green.

**Still open (need decisions/infra, not yet done):** H3 (move OAuth state to Redis), H4 (token revocation on logout/password-change), profile/change-password screens, a Household card on the Pricing page, L3 (Sentry/metrics), 0 frontend tests. Run `alembic upgrade head` to apply `h002`→`h004`; run `uv sync` (backend) to install `stripe`.

---

## CRITICAL — ship blockers (data leaks & broken core features)

### C1 — Integrations: cross-tenant OAuth tokens + broken at runtime
**File:** [backend/app/api/integrations.py](../backend/app/api/integrations.py)

Two compounding defects:

1. **Wrong service signatures → runtime `TypeError`.** The service layer was refactored to be user-aware but the router was not:
   - `save_tokens(db, provider, token_data)` is called, but the function is `save_tokens(user_id, db, provider, token_data)` ([google_oauth.py:142](../backend/app/services/integrations/google_oauth.py)). `db` is bound to `user_id`, and `token_data` is missing → exception on **every** OAuth callback.
   - Same mismatch for `sync_events(db)` → `sync_events(user_id, db, …)` and `get_stored_events(db, …)` → `get_stored_events(user_id, db, …)`. Calendar/Fit sync and reads all throw.
2. **No `user_id` scoping on reads + global-unique provider.** `list_integrations`, `get_status`, `disconnect`, `test_connection` run `select(IntegrationCredential).where(provider == …)` with **no user filter**, and the model declares `provider = Field(unique=True)` ([models/integration.py](../backend/app/models/integration.py)) instead of `UNIQUE(user_id, provider)`. Net effect if (1) were fixed: **only one user in the entire system can connect each provider, and any user can read/disconnect everyone's Google Calendar + Google Fit data and OAuth tokens.**

**Fix:** thread `current_user.id` into every service call; change the unique constraint to `UNIQUE(user_id, provider)` (migration); filter every read/delete by `user_id`. Add an integration test that connects provider as user A and asserts user B sees `disconnected`.

---

### C2 — AI Chat: IDOR on read/delete + writes crash
**File:** [backend/app/api/chat.py](../backend/app/api/chat.py) · model [models/chat.py](../backend/app/models/chat.py)

- `list_sessions`, `get_session`, `delete_session`, `patch_session` **never filter by `user_id`**. Any authenticated user can list, read (full message history), rename, archive, or delete **any other user's** chat sessions by ID. Classic IDOR.
- `chat_ws_handler` constructs `ChatSession()` and `ChatMessage(...)` **without `user_id`**, but both columns are `nullable=False` with no default → **`IntegrityError` on every message sent.** Chat persistence is non-functional under the new schema.

**Fix:** filter all queries by `current_user.id`; set `user_id` on insert; pass the authenticated user into `chat_ws_handler` (see C5 — the WS auth payload is currently discarded).

---

### C3 — ⌘L Quick Capture: writes crash + reads leak
**File:** [backend/app/api/captures.py](../backend/app/api/captures.py) · model [models/captures.py](../backend/app/models/captures.py)

- `create_capture` builds `Capture(raw_text=…)` with no `user_id`; column is `nullable=False` → **`IntegrityError` on every save.** The flagship ⌘L quick-log (wired in [GlobalCapture.tsx](../frontend/src/components/GlobalCapture.tsx)) is broken.
- `list_captures` returns **all users' captures** (no filter).

**Fix:** set `user_id=current_user.id` on insert; filter the list by user.

---

### C4 — Vault sync is a single shared resource across all tenants
**Files:** [backend/app/api/sync.py](../backend/app/api/sync.py), [main.py](../backend/app/main.py) lifespan

- The vault lives at a single `settings.vault_path` (`/tmp/vault`) watched globally; `VaultFile`/`VaultConflict` queries in `list_conflicts` / `resolve_conflict` are **not user-scoped**. Every tenant reads and resolves the same files.
- `sync_ws_handler` registers into a **global** subscriber set (`register_sync_subscriber`) — User A's file-change events are pushed to User B's socket.

**Fix:** Decide the model. Either (a) per-user vault roots (`vault_path/{user_id}/…`) + user-scoped queries + per-user WS rooms, or (b) drop vault sync from the multi-tenant product and keep it single-user/self-host only. This is an architecture decision, not a one-line patch.

---

### C5 — WebSocket handlers ignore the authenticated user
**File:** [backend/app/main.py:152-174](../backend/app/main.py)

`ws_auth(websocket)` returns the decoded JWT payload, but the result is only truth-tested — the user identity is **discarded** and never passed to `sync_ws_handler` / `chat_ws_handler` / `agents_ws_handler`. All three handlers therefore operate without knowing the tenant, which is the root cause enabling C2 and C4 on the socket path, and the cross-tenant agent broadcast below.

**Fix:** pass `user["sub"]` into each handler and scope all socket reads/writes/broadcasts to that user.

---

## HIGH — security & correctness

### H1 — Production login backdoor via legacy env credentials
**File:** [backend/app/api/auth.py:64-73](../backend/app/api/auth.py), [config.py:8](../backend/app/core/config.py)

`login` falls back to `APP_EMAIL` / `APP_PASSWORD` for "backward compat." The default password `demo1234` (currently set, 8 chars) is **not** in `_INSECURE_DEFAULTS = {"change-me-in-production","changeme","secret",""}`, so the production secret validator does **not** reject it. A deployment that forgets to override these ships with a known admin login.

**Fix:** remove the env-credential fallback entirely for production, or gate it behind `environment != "production"`. Treat any short/weak `APP_PASSWORD` as invalid in prod.

### H2 — `ENVIRONMENT` is empty → insecure cookies & skipped validation
**File:** `.env` (`ENVIRONMENT=` empty) → defaults to `"development"` ([config.py:18](../backend/app/core/config.py))

With `environment != "production"`: the auth cookie is set with `secure=False` ([auth.py:35](../backend/app/api/auth.py)) so the session token can travel over plain HTTP, **and** the production secret-strength validator is skipped. Any real deployment must set `ENVIRONMENT=production`.

### H3 — OAuth state stored in a process-local dict
**Files:** [auth.py:204](../backend/app/api/auth.py) (`_pending_states`), [google_oauth.py](../backend/app/services/integrations/google_oauth.py)

CSRF `state` is held in an in-memory dict. This (a) **breaks under more than one worker/replica** (callback may hit a process that never saw the state → "invalid state" failures), and (b) only evicts on successful pop, so abandoned flows leak memory. A horizontally-scaled SaaS needs this in Redis/DB with a TTL.

### H4 — No token revocation / refresh strategy
**File:** [security.py:12](../backend/app/core/security.py), [auth.py:129](../backend/app/api/auth.py)

JWTs live 30 days; `logout` only deletes the client cookie — a captured token stays valid for the full window. There is no refresh token, rotation, or server-side revocation list. For paid accounts (password change, "log out all devices", account deletion) you need revocation. `get_current_user` also never confirms the user still exists/active ([deps.py:23](../backend/app/core/deps.py)) — a deleted/suspended user keeps access until expiry.

### H5 — Weak input validation on auth
**File:** [auth.py:53,99](../backend/app/api/auth.py)

`LoginRequest.email` / `SignupRequest` use plain `str`, not `EmailStr`, and there is **no password policy** (length/complexity) on signup — `""` is accepted. Add `EmailStr` + a minimum password policy + (recommended) email verification before activation.

---

## MEDIUM — feature completeness & product gaps

### M1 — No monetization layer at all
Grep for `stripe|subscription|billing|entitlement|plan_tier|checkout` across `backend/app` = **0 hits**. There is a [PricingPage.tsx](../frontend/src/pages/PricingPage.tsx) marketing page but no checkout, no `subscriptions` table, no webhook handler, no per-plan feature gating. **The app cannot currently accept a subscription.** This is the #1 gap for "worth buying."

### M2 — Agents are a stub
**File:** [agents.py:109-137](../backend/app/api/agents.py)

`_run_agent` just `await asyncio.sleep(2)` and writes fake output (`"Agent completed … Run #N"`). The 8 "AI agents" advertised on the Agents page don't do anything. Also `seed_default_agents` ([agents.py:34](../backend/app/api/agents.py)) inserts agents with **no `user_id`**, so `list_agents` (which filters by user) returns them to **nobody** — new users see an empty Agents page.

### M3 — No self-serve signup UI
Backend `/auth/signup` exists but no frontend code calls it (confirmed via the API-mapping test and a frontend grep). New users can only enter via Google OAuth or seeded credentials. A self-serve SaaS needs a signup screen + onboarding.

### M4 — Push notifications not user-scoped
**File:** [push.py:31](../backend/app/api/push.py) — `subscribe` stores a `PushSubscription` with no `user_id`; notifications can't be reliably targeted per user, and `unsubscribe` removes by endpoint regardless of owner.

### M5 — Cross-tenant agent event broadcast
**File:** [agents.py:140-147](../backend/app/api/agents.py) — `_broadcast_agent` pushes `agent_started` / `agent_complete` (incl. `user_id`) to **every** connected socket.

---

## LOW — quality, ops, polish

- **L1 — Test coverage is thin and the harness is broken.** 4 backend test files; `test_auth` fails because the sqlite test DB has no `users` table (conftest doesn't create schema); 0 frontend tests; **0 multi-tenant isolation tests** (which is exactly why C1–C5 went unnoticed). The existing `test_api_mappings` already flags `signup`/`profile`/`change-password` as unmapped — a useful signal, keep it.
- **L2 — Pydantic v1 `class Config` deprecation** in [config.py:71](../backend/app/core/config.py) — migrate to `model_config = ConfigDict(...)` before Pydantic v3.
- **L3 — No error tracking / metrics.** Only `logging.info` request logs. Add Sentry (or similar), `/metrics`, and structured logs with request IDs before paying customers depend on it.
- **L4 — Generic 500 handler is good, but** there's no DB connection-pool health, no rate limit on auth `/me`, and no per-user (vs per-IP) rate limiting on expensive LLM endpoints.
- **L5 — Dead/placeholder code.** [Placeholders.tsx](../frontend/src/pages/areas/Placeholders.tsx) `PlaceholderPage` is imported in the router but unused (all areas are real) — and it uses a serif font, which violates the project's no-serif rule. Remove it.
- **L6 — `seed_finance_real_data.py` / `data_finance_2026.json`** ship personal seed data in the repo — make sure prod seeding is gated and these are not run against the production DB.

---

## What's genuinely good (don't regress these)

- **Frontend is polished and type-safe** — 0 `tsc` errors, lazy-loaded routes, route-level error boundaries, skeleton loaders, page transitions, a real design system (Premium Black + Gold), guide pages, and legal pages already in place.
- **The five area routers are correctly multi-tenanted** — finance/health/career/business/content consistently filter by `current_user.id` (verified on finance + counts on the rest).
- **Sensible security baseline exists** — httpOnly + SameSite=Strict cookie, PBKDF2-SHA256 @ 600k iterations, CSP + security headers middleware, single-origin CORS with credentials, slowapi rate limiting, Fernet token encryption, and a global exception handler that doesn't leak internals.
- **Service layer for Google integrations is already user-aware** — the fix for C1 is wiring, not a rewrite.

---

## Recommended fix order (gate to ship)

1. **Close C1–C5** — make chat, captures, push, integrations, and vault sync user-scoped (or remove vault from the SaaS). *Then write isolation tests so it can't regress (L1).* — **hard gate**
2. **H1, H2, H3, H4** — remove the prod backdoor, set `ENVIRONMENT=production`, move OAuth state to Redis, add token revocation on logout/password-change. — **hard gate**
3. **M1** — ship Stripe + a `subscriptions` table + plan entitlements + paywall. — **gate to charge money**
4. **M2, M3, M4** — make agents real (or hide them), build signup + onboarding, scope push. — **gate for a credible launch**
5. **L1–L4** — tests, Sentry, metrics. — **gate for paying customers at any scale**

See [`PRODUCT_ROADMAP.md`](./PRODUCT_ROADMAP.md) for the path from "fixed" to "award-worthy."
