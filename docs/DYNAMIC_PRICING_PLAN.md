# Control Tower Web — Dynamic / Modular Pricing Plan

**Date:** 2026-06-22
**Author:** Claude (Opus 4.8)
**Status:** PLANNED — not yet built
**Supersedes:** the fixed 4-tier model (Free / Pro / Pro Plus / Household) described in `CLAUDE.md` → Recent Updates → *Subscription Tiers and RBAC Enforcement*

---

## Goal

Move from **bundled tiers** to **pay-only-for-what-you-use**. A user pays a flat monthly price for each *module* they switch on, plus **metered AI usage** on top. One area is free forever; a discounted "Everything" bundle exists as an upsell.

Decisions locked with the product owner (2026-06-22):

| Question | Decision |
|---|---|
| Billing shape | **Hybrid** — flat per-module subscription + **metered AI** overage |
| What's billable | **8 modules**: 5 areas (`finance` · `health` · `career` · `business` · `content`) + 3 services (`chat` · `agents` · `integrations`) |
| Free floor + bundles | **Free base** (Dashboard + 1 area of the user's choice) + à-la-carte modules + one discounted **"Everything"** bundle |

---

## 1. Current state (what we're changing)

| Layer | File | Reality today |
|---|---|---|
| Pricing UI | `frontend/src/pages/PricingPage.tsx` | Hardcoded 4 tiers: Free / Pro $12 / Pro Plus $20 / Household $24, Business & Content shown as "+$10 add-ons" |
| Data model | `backend/app/models/billing.py` | `Subscription` has `plan: str` + `addons: list (JSON)` — storage for à-la-carte already exists |
| Backend gating | `backend/app/core/entitlements.py` | `require_plan` is **rank-based** (`free < pro < household`). **Does not know `pro_plus` or `addons`. No per-area/per-module check at all.** |
| Frontend gating | `frontend/src/router.tsx` (`RequireArea`, `RequirePlan`) | Gates Business/Content by `addons.includes(area)`. **This is the ONLY enforcement.** |
| Stripe | `backend/app/services/billing/service.py` | Prices only for `pro`/`household`. Webhook reads **one** line item → cannot represent multi-module subs. Add-ons only settable via **admin override**, not purchasable. |
| Admin override | `backend/app/api/admin.py` | Knows `pro_plus` + `addons`, can manually set them |
| Config | `backend/app/core/config.py` | Only `stripe_price_pro`, `stripe_price_household` |

### ⚠️ Security gap to fix as part of this work
Area/service gating lives **only in the React router**. The backend routers (`api/areas/business`, `api/areas/content`, `api/chat`, `api/agents`, `api/integrations`) have **no** plan/module check — a free user can call them directly with `curl` (auth bypass). The entitlement decision **must** move server-side. This is **Phase 0** and is valuable on its own, independent of Stripe.

---

## 2. Target model

```
Catalog (defined in code — 8 modules + 1 bundle)
┌──────────────────────────────────────────────────────────────┐
│ AREAS     finance · health · career · business · content      │  flat $/mo each
│ SERVICES  chat · agents · integrations                        │  flat $/mo each
│ BUNDLE    everything → grants all 8 at a discount             │  flat $/mo
│ METERED   ai_usage   → credits beyond a monthly free allotment│  $/unit
└──────────────────────────────────────────────────────────────┘

Entitlement resolution   get_entitled_modules(db, user) -> set[str]
   user.is_admin                 → ALL
   not settings.billing_enabled  → ALL          (preserves self-host / dev behavior)
   else                          → {sub.free_area} ∪ sub.modules
                                    (or ALL if sub.bundle)

Stripe mapping
   ONE Subscription, ONE line item per owned module  (+ a metered ai_usage item)
   enable a module  → add that line item   (prorated)
   disable a module → remove that line item (keep access until period end)
   buy the bundle   → swap individual items for the single bundle price
```

The mental shift: **the bill is derived from the line items; access is derived from the entitled module set.** No rank ladder, no "is this Pro Plus or an add-on" ambiguity.

### Suggested default prices (configurable — owner sets the real numbers)

| Module | Suggested $/mo | Notes |
|---|---|---|
| Each area (Finance…Content) | **$4** | 1 area free, the rest paid |
| Chat | $5 | AI assistant |
| Agents | $5 | automations / scheduled jobs |
| Integrations | $4 | Plaid + Google Calendar/Fit |
| **Everything bundle** | **$19** | vs ~$30 à-la-carte sum → clear upsell |
| Metered AI | 500 credits/mo free for module holders, then **$X per 1,000** | only billable for Chat/Agents owners; free users hard-capped |

> 1 AI credit ≈ one chat message or one agent run to start (normalize by token count later if cost variance demands it).

---

## 3. Data model

`backend/app/models/billing.py` — generalize `Subscription`, add a usage table:

```python
class Subscription(SQLModel, table=True):
    id, user_id (FK, unique), status, stripe_customer_id, stripe_subscription_id, current_period_end
    modules: list[str]      = []      # ← source of truth (replaces `plan` + `addons`)
    bundle: bool            = False   # bought the "Everything" price
    free_area: str | None   = None    # which single area the free tier unlocks
    created_at, updated_at

class AIUsageRecord(SQLModel, table=True):   # NEW
    id, user_id (FK, indexed)
    ts: datetime
    units: int                         # credits consumed
    source: str                        # "chat" | "agents" | "insights"
    reported_to_stripe: bool = False
```

**Migration** (one Alembic revision):
- add `modules` (JSON), `bundle` (bool), `free_area` (str, nullable) to `subscriptions`
- create `ai_usage_records` table
- **backfill** existing rows: `plan in {pro, pro_plus, household}` → grant the matching module set; fold `addons` into `modules`; set `bundle=True` for `household`
- then drop the legacy `plan` + `addons` columns
- **Alembic gotcha (from CLAUDE.md):** review the autogenerated migration and strip the spurious `captures` table DROP before `upgrade head`

Risk is low: `billing_enabled=false` today and there are no paying customers (only admin overrides).

---

## 4. Backend

### 4a. Entitlement core — rewrite `app/core/entitlements.py`
- `MODULE_CATALOG: dict[str, ModuleDef]` — `key → {label, kind: "area"|"service", price_setting}`; plus `BUNDLE_KEY = "everything"`.
- `get_entitled_modules(db, user) -> set[str]` (logic in §2).
- `require_module(key)` FastAPI dependency → **402** with the **module key in the detail** so the frontend can render a targeted upgrade wall. Replaces the rank-based `require_plan`.

### 4b. Close the security hole — apply `require_module` to backend routers

| Module | Router(s) to gate |
|---|---|
| finance / health / career / business / content | `api/areas/finance.py` … `content.py` |
| chat | `api/chat.py` + `/ws/chat` (after `ws_auth`, close 1008 if unentitled) |
| agents | `api/agents.py` + scheduler in `services/agents/runners.py` |
| integrations | `api/integrations.py` |

### 4c. Stripe — `services/billing/service.py` + `config.py`
- **Config:** one `STRIPE_MODULE_PRICES` JSON map in settings, e.g. `{"finance":"price_…", …, "everything":"price_…", "ai_usage":"price_…"}` (avoids 10 separate env vars).
- `reconcile_subscription(db, user, desired_modules, bundle)`:
  - compute desired price-id set (modules → prices, or the bundle price, + metered `ai_usage` item)
  - **no Stripe sub yet** → create a **Checkout Session** with those line items (captures the card)
  - **existing sub** → diff against current `SubscriptionItem`s → `SubscriptionItem.create` / `.delete` (prorated). Disables = remove at period end.
  - bundle on/off = swap individual items ↔ bundle price
  - all sync Stripe SDK calls wrapped in `asyncio.to_thread` (matches existing M-1 pattern)
- **Rewrite the webhook** `_apply_subscription_object`: iterate **all** `items.data`, map each `price.id → module key`, rebuild `sub.modules` + detect bundle. (Current code reads `items.data[0]` only — the root cause that makes add-ons impossible to buy.)

### 4d. Endpoints — `api/billing.py`
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/billing/catalog` | modules + prices + bundle → drives PricingPage |
| GET | `/api/billing/subscription` | `modules`, `free_area`, `bundle`, AI usage (used / included / overage) |
| POST | `/api/billing/modules` | set desired module set → `reconcile_subscription` |
| POST | `/api/billing/free-area` | pick / change the free area |
| POST | `/api/billing/checkout`, `/portal`, `/webhook` | keep (checkout now multi-item) |

### 4e. Metered AI (Phase 2)
- `meter_ai_usage(db, user_id, units, source)` called at the 3 LLM sites: `services/chat/`, `services/agents/runners.py`, `services/ai/`. Writes an `AIUsageRecord`.
- Free users / non-payers: **hard cap** at the free allotment (no card → no overage possible).
- Chat/Agents owners: metered overage beyond the allotment.
- APScheduler job (you already run several) batches `reported_to_stripe=False` records → Stripe usage records, then flips the flag.

---

## 5. Frontend

- **`PricingPage.tsx`** → render from `GET /catalog`: a toggle grid of modules with a **live running total**, the highlighted "Everything" bundle, a free-area selector, and a metered-AI explainer. Remove the hardcoded 4 tiers.
- **Settings** → "Manage modules" panel: toggle modules on/off (`POST /modules`), AI usage gauge (used / included / overage).
- **Gating** (`router.tsx`) → collapse `RequireArea` + `RequirePlan` into one `RequireModule` driven by `sub.modules`; delete the guessy comment block (lines ~110-121). Backend is the real enforcement; this is UX only.
- **`UpgradeWall`** → on a 402, read the module key from the response and show *"Enable Finance — $4/mo"* instead of a generic `/pricing` redirect.
- **Sidebar** → show locked modules with a lock icon + inline upsell.
- API/types: extend `api/billing.ts` (`modules`, `bundle`, `free_area`, `catalog`, `setModules`) and `useSubscription.ts`.

---

## 6. Phased rollout (each phase independently shippable + verifiable)

| Phase | Scope | Verify |
|---|---|---|
| **0 — Lock the model + close the hole** | ✅ **DONE (2026-06-23):** `require_module` core in `entitlements.py` (`get_entitled_modules` + 402-with-module-key); applied to all area + service routers (`main.py` `include_router`) + chat/agents WS (`ws_entitled`). Entitled set *derived from legacy `plan`+`addons`* — the `addons→modules`/`free_area`/`ai_usage_records` **migration moved to Phase 1** (coupled to the Stripe rewrite; avoids a half-migrated model with no writer). | ✅ Verified: free user → **402** on `/api/areas/business` & `/content` (`test_billing.py`, 37 green). |
| **1 — Modular billing** | ✅ **BUILT (2026-06-23):** migration `h010` (`modules`/`bundle`/`free_area` + backfill, `plan`/`addons` kept); `get_entitled_modules` reads `modules`; `STRIPE_MODULE_PRICES`; `set_modules`/`reconcile_subscription`; **multi-item webhook** (rebuilds `modules` from all line items); `/catalog` + `/modules` + `/free-area`; `GET /subscription` returns `modules`/`entitled`; frontend `RequireModule` (replaces `RequireArea`/`RequirePlan`), PricingPage CTA → `setModules`, Settings "Billing & modules" panel. | ✅ Offline: 44 green (`test_billing.py` — webhook multi-item + bundle, `/modules` billing-off, `/free-area`, modules source-of-truth). ⚠️ **Pending live Stripe test-mode:** existing-sub item-diff + checkout completion (enable Finance → 1 item; add Health → 2; buy bundle → swap). |
| **2 — Metered AI** | ✅ **BUILT (2026-06-23):** `AIUsageRecord` (migration `h011`); `services/billing/usage.py` (`record_ai_usage`/`usage_this_month`/`ai_allowed`/`monthly_summary`/`report_usage_to_stripe`); metering at all 3 LLM sites (`api/ai.py` + quota dep, agent runner, chat WS); `GET /billing/usage`; hourly `billing_usage_report` job; Settings usage gauge; `ai_free_monthly_credits`. | ✅ Offline: 50 green (`test_usage.py` — record/sum, endpoint overage, hard-cap vs owner-overage, billing-off unlimited, drain). ⚠️ **Pending live Stripe:** the outbound `create_usage_record` + an `ai_usage` price/subscription-item (not yet added by `reconcile_subscription`). |
| **3 — Polish** | ✅ **PARTIAL (2026-06-23):** metered `ai_usage` item attached in `reconcile_subscription`; `past_due` grace (`GRACE_STATUSES`, webhook + entitlement) + Settings dunning banner; proration copy on configurator. **Deferred:** dropping legacy `plan`/`addons` columns (do after live-Stripe verification). | ✅ 53 green (`_desired_line_items` attaches ai_usage; `past_due` keeps modules; `canceled` drops to free). Docs synced. |

---

## 7. Decisions / defaults (change here if you disagree)

1. **Disabling a module keeps access until period end** (cleaner than instant cut + refund; Stripe handles proration on re-add).
2. **Free area is freely changeable** (entitlement-only, no billing event).
3. **Catalog lives in code**, not a DB admin UI — 8 modules + 1 bundle doesn't justify CRUD. Easy to promote to a DB table later if operator-editable pricing is wanted.
4. **Self-host / dev unchanged:** `billing_enabled=false` → everything unlocked, exactly as today.
5. **AI credit ≈ one chat message / agent run** to start; switch to token-normalized credits only if cost variance demands it.

## 8. Open questions before Phase 1

- Final per-module prices + bundle price + metered AI rate (table in §2 are placeholders).
- Annual billing option? (Stripe supports it via a second price per module — adds catalog surface; recommend deferring.)
- Do Integrations/Chat/Agents require owning ≥1 area first, or are they standalone purchasable? (Plan assumes standalone.)

---

**Related:** `CLAUDE.md` (pivot note + backlog), `docs/SHIP_READINESS_AUDIT.md` ("no billing system" verdict), `docs/PRODUCT_ROADMAP.md`.
