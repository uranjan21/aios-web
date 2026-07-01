"""Stripe billing service.

`stripe` is imported lazily so the app runs without the package installed; billing
is inert until STRIPE_SECRET_KEY + a price id are configured (settings.billing_enabled).
"""
import asyncio
import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import select

from app.core.config import get_settings
from app.core.entitlements import ALL_MODULES, BUNDLE_KEY, GRACE_STATUSES
from app.models.billing import Subscription
from app.models.user import User

logger = logging.getLogger(__name__)

VALID_PLANS = {"free", "pro", "household"}


def _price_for_module(key: str) -> Optional[str]:
    """Stripe price id for a module/bundle key, from STRIPE_MODULE_PRICES."""
    return get_settings().stripe_module_prices.get(key)


def _module_for_price(price_id: Optional[str]) -> Optional[str]:
    """Reverse map: Stripe price id → module/bundle key."""
    if not price_id:
        return None
    for key, pid in get_settings().stripe_module_prices.items():
        if pid == price_id:
            return key
    return None


def _desired_line_items(desired_modules: set[str], bundle: bool) -> list[dict]:
    """Build Stripe line items for the desired entitlement.

    Bundle collapses to a single 'everything' price. Modules with no configured
    price are skipped (logged) so a partial catalog can't block checkout.
    """
    if bundle:
        price = _price_for_module(BUNDLE_KEY)
        if not price:
            raise RuntimeError(f"No Stripe price configured for '{BUNDLE_KEY}'")
        items = [{"price": price, "quantity": 1}]
    else:
        items = []
        for key in sorted(desired_modules & set(ALL_MODULES)):
            price = _price_for_module(key)
            if price:
                items.append({"price": price, "quantity": 1})
            else:
                logger.warning("No Stripe price for module '%s' — skipping", key)

    # Attach the metered AI usage item when the user owns a metered module, so the
    # Phase-2 reporting job has a subscription item to push usage to. Metered
    # prices carry no quantity.
    owns_metered = bundle or bool({"chat", "agents"} & desired_modules)
    ai_price = _price_for_module("ai_usage")
    if owns_metered and ai_price:
        items.append({"price": ai_price})
    return items


def _stripe():
    """Return a configured stripe module, or raise if unavailable/unconfigured."""
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise RuntimeError("Stripe is not configured")
    import stripe  # lazy — keeps the package optional
    stripe.api_key = settings.stripe_secret_key
    return stripe


def _price_for_plan(plan: str) -> Optional[str]:
    settings = get_settings()
    return {"pro": settings.stripe_price_pro, "household": settings.stripe_price_household}.get(plan)


def _plan_for_price(price_id: str) -> str:
    settings = get_settings()
    mapping = {settings.stripe_price_pro: "pro", settings.stripe_price_household: "household"}
    return mapping.get(price_id, "free")


async def get_subscription(db, user_id: uuid.UUID) -> Optional[Subscription]:
    return (await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )).scalar_one_or_none()


async def get_or_create_subscription(db, user_id: uuid.UUID) -> Subscription:
    sub = await get_subscription(db, user_id)
    if sub is None:
        sub = Subscription(user_id=user_id, plan="free", status="active")
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
    return sub


async def _ensure_customer(db, user: User, sub: Subscription) -> str:
    if sub.stripe_customer_id:
        return sub.stripe_customer_id
    stripe = _stripe()
    # Run sync Stripe SDK call in a thread to avoid blocking the asyncio event loop (M-1).
    customer = await asyncio.to_thread(
        stripe.Customer.create,
        email=user.email,
        name=user.name,
        metadata={"user_id": str(user.id)},
    )
    sub.stripe_customer_id = customer["id"]
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return customer["id"]


async def create_checkout_session(db, user: User, plan: str, success_url: str, cancel_url: str) -> str:
    if plan not in {"pro", "household"}:
        raise ValueError("Checkout is only for paid plans")
    price_id = _price_for_plan(plan)
    if not price_id:
        raise RuntimeError(f"No Stripe price configured for plan '{plan}'")
    stripe = _stripe()
    sub = await get_or_create_subscription(db, user.id)
    customer_id = await _ensure_customer(db, user, sub)
    session = await asyncio.to_thread(
        stripe.checkout.Session.create,
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        client_reference_id=str(user.id),
        allow_promotion_codes=True,
    )
    return session["url"]


async def create_portal_session(db, user: User, return_url: str) -> str:
    sub = await get_subscription(db, user.id)
    if not sub or not sub.stripe_customer_id:
        raise RuntimeError("No billing account for this user")
    stripe = _stripe()
    session = await asyncio.to_thread(
        stripe.billing_portal.Session.create,
        customer=sub.stripe_customer_id,
        return_url=return_url,
    )
    return session["url"]


async def set_free_area(db, user_id: uuid.UUID, area: Optional[str]) -> Subscription:
    """Pick/change the single free area. Entitlement-only — no Stripe event."""
    sub = await get_or_create_subscription(db, user_id)
    sub.free_area = area if (area in ALL_MODULES) else None
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return sub


async def set_modules(db, user: User, modules, bundle: bool) -> dict:
    """Set the desired owned-module set.

    Billing off (self-host/dev) → persist directly (free, no payment). Billing on
    → reconcile via Stripe; the *local* `modules` are then updated by the webhook
    once Stripe confirms. Returns `{"checkout_url": str | None, ...}`.
    """
    settings = get_settings()
    desired = set(ALL_MODULES) if bundle else (set(modules) & set(ALL_MODULES))
    sub = await get_or_create_subscription(db, user.id)

    if not settings.billing_enabled:
        sub.modules = sorted(desired)
        sub.bundle = bool(bundle)
        sub.status = "active"
        sub.updated_at = datetime.utcnow()
        db.add(sub)
        await db.commit()
        await db.refresh(sub)
        return {"checkout_url": None, "modules": sub.modules, "bundle": sub.bundle}

    return await reconcile_subscription(db, user, sub, desired, bundle)


async def reconcile_subscription(db, user: User, sub: Subscription, desired_modules: set[str], bundle: bool) -> dict:
    """Bring the user's Stripe subscription in line with the desired entitlement.

    No Stripe sub yet → a Checkout Session (captures the card + creates the sub).
    Existing sub → diff `SubscriptionItem`s (prorated add/remove). The local
    `modules` column is rebuilt from the resulting webhook, not here.

    NOTE: the existing-subscription diff path is only exercised with live Stripe
    (test-mode keys) — there is no offline unit coverage for it.
    """
    settings = get_settings()
    stripe = _stripe()
    customer_id = await _ensure_customer(db, user, sub)
    desired_items = _desired_line_items(desired_modules, bundle)
    if not desired_items:
        raise ValueError("No billable modules selected")

    if not sub.stripe_subscription_id:
        session = await asyncio.to_thread(
            stripe.checkout.Session.create,
            mode="subscription",
            customer=customer_id,
            line_items=desired_items,
            success_url=f"{settings.allowed_origin}/app/settings?billing=success",
            cancel_url=f"{settings.allowed_origin}/pricing",
            client_reference_id=str(user.id),
            allow_promotion_codes=True,
        )
        return {"checkout_url": session["url"]}

    # Existing subscription → diff items against the desired price set.
    current = await asyncio.to_thread(stripe.Subscription.retrieve, sub.stripe_subscription_id)
    current_items = {
        (it.get("price") or {}).get("id"): it.get("id")
        for it in current.get("items", {}).get("data", [])
    }
    desired_prices = {li["price"] for li in desired_items}

    for price_id in desired_prices - set(current_items):
        await asyncio.to_thread(
            stripe.SubscriptionItem.create,
            subscription=sub.stripe_subscription_id, price=price_id, proration_behavior="create_prorations",
        )
    for price_id, item_id in current_items.items():
        if price_id not in desired_prices and item_id:
            await asyncio.to_thread(
                stripe.SubscriptionItem.delete, item_id, proration_behavior="create_prorations",
            )
    return {"checkout_url": None}


async def _apply_subscription_object(db, obj: dict) -> None:
    """Update the local Subscription row from a Stripe subscription object."""
    customer_id = obj.get("customer")
    if not customer_id:
        return
    sub = (await db.execute(
        select(Subscription).where(Subscription.stripe_customer_id == customer_id)
    )).scalar_one_or_none()
    if sub is None:
        logger.warning("Webhook for unknown customer %s — ignoring", customer_id)
        return

    status = obj.get("status", "active")
    sub.status = status
    sub.stripe_subscription_id = obj.get("id")

    # Rebuild the owned module set from ALL line items (not just the first), so a
    # multi-module subscription is represented faithfully. `past_due` keeps modules
    # (grace) so dunning doesn't revoke access mid-retry.
    active = status in GRACE_STATUSES
    owned: set[str] = set()
    bundle = False
    for item in obj.get("items", {}).get("data", []) or []:
        key = _module_for_price((item.get("price") or {}).get("id"))
        if key == BUNDLE_KEY:
            bundle = True
        elif key in ALL_MODULES:
            owned.add(key)

    if active:
        sub.bundle = bundle
        sub.modules = sorted(ALL_MODULES) if bundle else sorted(owned)
    else:
        sub.bundle = False
        sub.modules = []
    # Keep the legacy `plan` roughly in sync for any back-compat display.
    sub.plan = "household" if (active and bundle) else ("pro" if (active and owned) else "free")

    period_end = obj.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.utcfromtimestamp(period_end)
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    await db.commit()


# In-process idempotency cache: event_id → monotonic timestamp (L-5).
# Prevents duplicate processing within a single server lifetime.
# Not durable across restarts — use a DB table for full production guarantees.
import time as _time
_seen_events: dict[str, float] = {}


def _is_duplicate_event(event_id: str) -> bool:
    now = _time.monotonic()
    # Evict entries older than 24 h to bound memory.
    expired = [k for k, ts in list(_seen_events.items()) if now - ts > 86_400]
    for k in expired:
        del _seen_events[k]
    return event_id in _seen_events


def _mark_event_seen(event_id: str) -> None:
    _seen_events[event_id] = _time.monotonic()


async def handle_webhook_event(db, event: dict) -> None:
    """Process a verified Stripe webhook event."""
    event_id = event.get("id", "")
    if event_id and _is_duplicate_event(event_id):
        logger.info("Skipping duplicate Stripe event %s", event_id)
        return

    etype = event.get("type", "")
    obj = event.get("data", {}).get("object", {})

    if etype in ("customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"):
        await _apply_subscription_object(db, obj)
    elif etype == "checkout.session.completed":
        # Fetch the subscription to get plan + period, then apply.
        sub_id = obj.get("subscription")
        if sub_id:
            try:
                stripe = _stripe()
                full = await asyncio.to_thread(stripe.Subscription.retrieve, sub_id)
                await _apply_subscription_object(db, full)
            except Exception as e:  # pragma: no cover - network
                logger.error("Failed to retrieve subscription %s: %s", sub_id, e)
                raise
    else:
        logger.debug("Unhandled Stripe event type: %s", etype)

    # Only mark seen after successful processing — a failed write should be retried by Stripe.
    if event_id:
        _mark_event_seen(event_id)
