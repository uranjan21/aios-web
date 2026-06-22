"""Stripe billing service.

`stripe` is imported lazily so the app runs without the package installed; billing
is inert until STRIPE_SECRET_KEY + a price id are configured (settings.billing_enabled).
"""
import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlmodel import select

from app.core.config import get_settings
from app.models.billing import Subscription
from app.models.user import User

logger = logging.getLogger(__name__)

VALID_PLANS = {"free", "pro", "household"}


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
    customer = stripe.Customer.create(email=user.email, name=user.name, metadata={"user_id": str(user.id)})
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
    session = stripe.checkout.Session.create(
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
    session = stripe.billing_portal.Session.create(customer=sub.stripe_customer_id, return_url=return_url)
    return session["url"]


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
    # Derive plan from the first line item's price
    try:
        price_id = obj["items"]["data"][0]["price"]["id"]
        sub.plan = _plan_for_price(price_id) if status in ("active", "trialing") else "free"
    except (KeyError, IndexError, TypeError):
        pass
    period_end = obj.get("current_period_end")
    if period_end:
        sub.current_period_end = datetime.utcfromtimestamp(period_end)
    if status in ("canceled", "incomplete_expired", "unpaid"):
        sub.plan = "free"
    sub.updated_at = datetime.utcnow()
    db.add(sub)
    await db.commit()


async def handle_webhook_event(db, event: dict) -> None:
    """Process a verified Stripe webhook event."""
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
                full = stripe.Subscription.retrieve(sub_id)
                await _apply_subscription_object(db, full)
            except Exception as e:  # pragma: no cover - network
                logger.error("Failed to retrieve subscription %s: %s", sub_id, e)
    else:
        logger.debug("Unhandled Stripe event type: %s", etype)
