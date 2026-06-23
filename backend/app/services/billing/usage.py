"""Metered AI usage (Phase 2).

Records one row per metered AI action, aggregates per calendar month for quota,
and batches unreported overage to Stripe's metered billing.

Quota model: every user gets `ai_free_monthly_credits` free actions/month. Past
that, owners of a metered module (chat/agents) keep going (overage is billed);
everyone else is hard-capped. Billing-disabled installs and admins are unlimited.
"""
import logging
import uuid
from datetime import datetime

from fastapi import Depends, HTTPException, status
from sqlmodel import select, func

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.entitlements import modules_for_subscription
from app.models.billing import AIUsageRecord, Subscription

logger = logging.getLogger(__name__)

METERED_MODULES = {"chat", "agents"}


def _month_start(now: datetime | None = None) -> datetime:
    now = now or datetime.utcnow()
    return datetime(now.year, now.month, 1)


async def record_ai_usage(db, user_id, units: int = 1, source: str = "chat") -> None:
    """Append a usage record. Best-effort — never let metering break the AI call."""
    try:
        db.add(AIUsageRecord(user_id=user_id, units=units, source=source))
        await db.commit()
    except Exception:  # pragma: no cover - defensive
        logger.exception("Failed to record AI usage for %s", user_id)
        await db.rollback()


async def usage_this_month(db, user_id) -> int:
    total = (await db.execute(
        select(func.coalesce(func.sum(AIUsageRecord.units), 0))
        .where(AIUsageRecord.user_id == user_id, AIUsageRecord.ts >= _month_start())
    )).scalar_one()
    return int(total or 0)


async def _owns_metered_module(db, user_id) -> bool:
    sub = (await db.execute(
        select(Subscription).where(Subscription.user_id == user_id)
    )).scalar_one_or_none()
    return bool(METERED_MODULES & modules_for_subscription(sub))


async def ai_allowed(db, user) -> bool:
    """False only when a non-paying user is over the free monthly cap."""
    settings = get_settings()
    if not settings.billing_enabled or getattr(user, "is_admin", False):
        return True
    if await usage_this_month(db, user.id) < settings.ai_free_monthly_credits:
        return True
    return await _owns_metered_module(db, user.id)


async def monthly_summary(db, user) -> dict:
    """Usage gauge data: used / included / overage / whether overage is billable."""
    settings = get_settings()
    used = await usage_this_month(db, user.id)
    included = settings.ai_free_monthly_credits
    metered = await _owns_metered_module(db, user.id) if settings.billing_enabled else False
    return {
        "used": used,
        "included": included,
        "overage": max(0, used - included),
        "metered": metered,  # True → overage is billed; False → hard cap at `included`
    }


def enforce_ai_quota():
    """FastAPI dependency → 402 when a non-payer is over the free monthly cap."""
    async def _dep(current_user=Depends(get_current_user), db=Depends(get_db)) -> None:
        if not await ai_allowed(db, current_user):
            settings = get_settings()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail={"error": "ai_quota_exceeded", "limit": settings.ai_free_monthly_credits},
            )
    return _dep


async def report_usage_to_stripe(db) -> int:
    """Batch unreported usage → Stripe metered records, then flip the flag.

    Reports only overage for users who own the metered `ai_usage` Stripe item.
    Returns the number of records marked reported. The Stripe call path needs
    live test-mode keys; with billing off or no `ai_usage` price it no-ops.
    """
    settings = get_settings()
    rows = (await db.execute(
        select(AIUsageRecord).where(AIUsageRecord.reported_to_stripe == False)  # noqa: E712
    )).scalars().all()
    if not rows:
        return 0

    ai_price = settings.stripe_module_prices.get("ai_usage") if settings.billing_enabled else None
    if not ai_price:
        # Nothing to report to (self-host / no metered price). Mark as reported so
        # the backlog doesn't grow unbounded; usage stays queryable locally.
        for r in rows:
            r.reported_to_stripe = True
            db.add(r)
        await db.commit()
        return len(rows)

    # Aggregate units per user, then report to each user's ai_usage subscription item.
    from app.services.billing.service import _stripe  # lazy, optional dep
    import asyncio
    per_user: dict[uuid.UUID, int] = {}
    for r in rows:
        per_user[r.user_id] = per_user.get(r.user_id, 0) + r.units

    stripe = _stripe()
    reported = 0
    for user_id, units in per_user.items():
        sub = (await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )).scalar_one_or_none()
        if not sub or not sub.stripe_subscription_id:
            continue
        try:
            current = await asyncio.to_thread(stripe.Subscription.retrieve, sub.stripe_subscription_id)
            item_id = next(
                (it.get("id") for it in current.get("items", {}).get("data", [])
                 if (it.get("price") or {}).get("id") == ai_price),
                None,
            )
            if not item_id:
                continue
            await asyncio.to_thread(
                stripe.SubscriptionItem.create_usage_record,
                item_id, quantity=units, action="increment",
            )
            reported += units
        except Exception:  # pragma: no cover - network
            logger.exception("Failed to report AI usage for %s", user_id)
            continue

    for r in rows:
        r.reported_to_stripe = True
        db.add(r)
    await db.commit()
    return reported


async def run_usage_report_job() -> None:
    """APScheduler entry — open a session and report metered AI usage."""
    from app.db.session import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as db:
            n = await report_usage_to_stripe(db)
        if n:
            logger.info("AI usage report: %d units processed", n)
    except Exception:  # pragma: no cover - defensive
        logger.exception("AI usage reporting job failed")
