"""Rule-based anomaly detection — runs daily, surfaces via bell (agents WS) + web push.

Deterministic rules, no LLM: predictable, free, explainable.
"""
import logging
from datetime import datetime, timedelta

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import FinanceExpense
from app.models.health import HealthLog
from app.services.notifications.push import send_push_to_all
import uuid

logger = logging.getLogger(__name__)

SPIKE_FACTOR = 2.0       # this week ≥ 2× the prior 4-week weekly average
SPIKE_MIN_AMOUNT = 1000  # ignore spikes under ₹1000 — noise
GYM_GAP_DAYS = 4         # alert when a regular lifter goes quiet this long
GYM_REGULAR_MIN = 3      # "regular" = ≥3 sessions in the prior 14 days


async def detect_anomalies(user_id: uuid.UUID) -> int:
    from app.api.agents import _broadcast_agent

    now = datetime.utcnow()
    fired = 0
    alerts: list[tuple[str, str]] = []

    async with AsyncSessionLocal() as session:
        # ── Rule 1: category spending spike (this week vs prior 4-week avg) ──
        week_start = now - timedelta(days=7)
        prior_start = now - timedelta(days=35)

        recent = (await session.execute(
            select(FinanceExpense).where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= prior_start)
        )).scalars().all()

        this_week: dict = {}
        prior: dict = {}
        for e in recent:
            cat = e.category or "Uncategorized"
            if e.logged_at >= week_start:
                this_week[cat] = this_week.get(cat, 0) + float(e.amount)
            else:
                prior[cat] = prior.get(cat, 0) + float(e.amount)

        for cat, amount in this_week.items():
            weekly_avg = prior.get(cat, 0) / 4
            if weekly_avg > 0 and amount >= SPIKE_MIN_AMOUNT and amount >= weekly_avg * SPIKE_FACTOR:
                alerts.append((
                    f"Spending spike: {cat}",
                    f"₹{amount:,.0f} this week vs ₹{weekly_avg:,.0f} weekly average ({amount / weekly_avg:.1f}×)",
                ))

        # ── Rule 2: gym streak gone quiet ──
        gym = (await session.execute(
            select(HealthLog)
            .where(HealthLog.user_id == user_id, HealthLog.entry_type == "gym", HealthLog.logged_at >= now - timedelta(days=18))
            .order_by(HealthLog.logged_at)
        )).scalars().all()
        if gym:
            last = max(g.logged_at for g in gym)
            gap = (now - last).days
            prior_sessions = [g for g in gym if g.logged_at < now - timedelta(days=GYM_GAP_DAYS)]
            if gap >= GYM_GAP_DAYS and len(prior_sessions) >= GYM_REGULAR_MIN:
                alerts.append((
                    "Gym streak at risk",
                    f"No workout in {gap} days — you averaged {len(prior_sessions)} sessions the two weeks before",
                ))

    for title, body in alerts:
        await _broadcast_agent(user_id, {"type": "anomaly", "title": title, "body": body})
        await send_push_to_all(user_id, title, body, "/")
        fired += 1

    if fired:
        logger.info("Anomaly detector fired %d alert(s)", fired)
    return fired
