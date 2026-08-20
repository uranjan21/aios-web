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
    """Whether this user may make another metered AI call right now.

    - Admins: always.
    - Dev / self-host (non-production, billing off): unlimited.
    - Production: every user gets `ai_free_monthly_credits` free calls/month.
      Over that, paid users with a metered module get overage; on a public
      free launch (billing off) users are HARD-CAPPED. This is the cost/abuse
      backstop so an anonymous signup can't run up unbounded LLM spend on our
      provider key when billing isn't live yet.
    """
    settings = get_settings()
    if getattr(user, "is_admin", False):
        return True
    if settings.environment != "production" and not settings.billing_enabled:
        return True
    if await usage_this_month(db, user.id) < settings.ai_free_monthly_credits:
        return True
    if not settings.billing_enabled:
        return False
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


REPORT_BATCH_SIZE = 5000


async def report_usage_to_stripe(db) -> int:
    """Batch unreported usage → Stripe metered records, then flip the flag.

    Reports only overage for users who own the metered `ai_usage` Stripe item.
    Returns the number of units successfully reported. The Stripe call path needs
    live test-mode keys; with billing off or no `ai_usage` price it no-ops.

    A record is flipped to `reported_to_stripe` ONLY when Stripe accepted it. A
    Stripe outage therefore leaves the row pending and the next run retries it —
    the previous unconditional flip made an outage permanently unbillable.

    The scan is bounded (`REPORT_BATCH_SIZE`, oldest first) — it is global across
    tenants and used to load the entire backlog into memory.
    """
    settings = get_settings()
    ai_price = settings.stripe_module_prices.get("ai_usage") if settings.billing_enabled else None

    base = (
        select(AIUsageRecord)
        .where(AIUsageRecord.reported_to_stripe == False)  # noqa: E712
        .order_by(AIUsageRecord.ts)
        .limit(REPORT_BATCH_SIZE)
    )

    if not ai_price:
        # DRAIN branch — there is no metered price at all (self-host / billing off),
        # so this usage is not billable now and never will be. Flipping the flag is
        # correct here: it keeps the backlog bounded and the rows stay queryable
        # locally. This is NOT the same as the reporting branch below, where a flip
        # would destroy billable revenue.
        rows = (await db.execute(base)).scalars().all()
        if not rows:
            return 0
        for r in rows:
            r.reported_to_stripe = True
            db.add(r)
        await db.commit()
        return len(rows)

    # REPORTING branch. Only scan rows belonging to users who actually have a Stripe
    # subscription to bill to. Usage from users with no subscription is deliberately
    # left pending rather than flipped (it was never billed) — and excluding it from
    # the scan is what keeps that permanent residue from starving the bounded batch.
    billable_users = select(Subscription.user_id).where(
        Subscription.stripe_subscription_id != None  # noqa: E711
    )
    rows = (await db.execute(base.where(AIUsageRecord.user_id.in_(billable_users)))).scalars().all()
    if not rows:
        return 0

    # Aggregate units per user, then report to each user's ai_usage subscription item.
    from app.services.billing.service import _stripe  # lazy, optional dep
    import asyncio
    per_user: dict[uuid.UUID, int] = {}
    for r in rows:
        per_user[r.user_id] = per_user.get(r.user_id, 0) + r.units

    stripe = _stripe()
    reported = 0
    reported_user_ids: set[uuid.UUID] = set()
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
                # Subscription exists but carries no ai_usage item — nothing to push
                # to yet. Leave pending so it reports once the item is attached.
                continue
            await asyncio.to_thread(
                stripe.SubscriptionItem.create_usage_record,
                item_id, quantity=units, action="increment",
            )
            reported += units
            reported_user_ids.add(user_id)
        except Exception:  # pragma: no cover - network
            logger.exception("Failed to report AI usage for %s", user_id)
            continue

    pending = 0
    for r in rows:
        if r.user_id in reported_user_ids:
            r.reported_to_stripe = True
            db.add(r)
        else:
            pending += 1
    await db.commit()
    if pending:
        logger.warning("AI usage report: %d record(s) left pending for retry", pending)
    return reported


async def run_usage_report_job() -> None:
    """APScheduler entry — open a session and report metered AI usage.

    One bounded batch per run; anything left over is picked up by the next run.
    """
    from app.db.session import AsyncSessionLocal
    try:
        async with AsyncSessionLocal() as db:
            n = await report_usage_to_stripe(db)
        if n:
            logger.info("AI usage report: %d units processed (batch cap %d)", n, REPORT_BATCH_SIZE)
    except Exception:  # pragma: no cover - defensive
        logger.exception("AI usage reporting job failed")
