# Dynamic Pricing Plan — RETIRED 2026-08-17

**This plan is dead. Control Tower is free for everyone, bring-your-own-API-key.**

There is no charging, no subscription, no Stripe, no module entitlement, no plan
gating, and no AI usage metering anywhere in the product. Do not implement
anything from the version of this document that used to live here, and do not
reintroduce these concepts from the historical entries in `CLAUDE.md` or
`PROGRESS.md` — those are a build log, not a spec.

## What replaced it

Each user supplies their own LLM provider key (OpenAI or Anthropic) in
**Settings → AI & knowledge**. It is stored Fernet-encrypted in `user_api_keys`
and their provider bills them directly. The server never calls an LLM on its own
account.

## Why the whole billing system could be deleted

The metering, credit quotas and per-user caps existed for exactly one reason:
the operator's API key paid for every user's AI usage, so a public signup page
was an unbounded liability. That is what the 2026-08-16 audit flagged as an
uncapped-spend hole.

Under BYOK the liability is gone, so everything built to contain it is gone too.

**The corollary is the important part:** there is deliberately **no
instance-level `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` fallback**. Adding one
"for convenience" — so users without a key still get AI — restores the exact
liability, and with it the need for every quota, credit counter and cap that was
just removed. If you ever find yourself adding that fallback, you are
re-deriving the paid product.

## What was removed (2026-08-17)

- Backend: `api/billing.py`, `services/billing/`, `models/billing.py`,
  `models/billing_event.py`, and all of `core/entitlements.py`
  (`require_module`, `require_plan`, `ws_entitled`, the module catalogue).
- Tables dropped: `subscriptions`, `ai_usage_records`, `failed_webhooks`,
  `stripe_event_idempotency` (migration `m001_drop_billing` — irreversible for
  row data, an explicit user decision).
- Config: every `stripe_*` setting, `billing_enabled`,
  `ai_free_monthly_credits`, and the instance-level LLM API keys.
- Frontend: `PricingPage`, `lib/pricing.ts`, `UpgradeWall`, `RequireModule`,
  `useSubscription`, `usePricingCurrency`, `api/billing.ts`, the Settings
  "Plan & usage" tab, and all pricing copy on the landing page.
- The `stripe` Python dependency.

## Consequences worth knowing

- **`TOKEN_ENCRYPTION_KEY` is now mandatory in production.** It protects users'
  own API keys, not just OAuth tokens. Rotating it makes every stored key
  unreadable and forces every user to re-enter theirs — back it up with your
  secrets.
- **HTTP 402 is no longer used.** "You need to configure an API key" is
  **428 Precondition Required** with `{"error": "no_api_key", "provider": …}`.
- Background jobs (agents, briefings, extraction) degrade to their existing
  facts-only path for users with no key. They must never raise or retry-storm.

Historical context for how the paid model was designed lives in the
`CLAUDE.md` / `PROGRESS.md` entries from 2026-06-22 through 2026-08-10.
