"""Budget threshold alerts — fires once per category per month at 80% and 100%.

Called after expense writes and after recurring auto-posts. Sends a web push
and a WS bell event. Idempotency via alert_80_period / alert_100_period on
budget_limits ("YYYY-MM" of last fire).
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import func
from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import BudgetLimit, FinanceExpense
from app.services.notifications.push import send_push_to_all
import uuid

logger = logging.getLogger(__name__)


async def check_budget_alerts(user_id: uuid.UUID, category: Optional[str] = None) -> None:
    """Check one category (or all with limits) against the current month's spend."""
    from app.api.agents import _broadcast_agent

    now = datetime.utcnow()
    period = now.strftime("%Y-%m")
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    # next month's first day as the exclusive upper bound
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1)
    else:
        month_end = month_start.replace(month=month_start.month + 1)

    try:
        async with AsyncSessionLocal() as session:
            query = select(BudgetLimit).where(BudgetLimit.user_id == user_id)
            if category:
                query = query.where(BudgetLimit.category == category)
            limits = (await session.execute(query)).scalars().all()

            alerts = []
            for limit in limits:
                monthly_limit = float(limit.monthly_limit)
                if monthly_limit <= 0:
                    continue
                spent = (await session.execute(
                    select(func.coalesce(func.sum(FinanceExpense.amount), 0))
                    .where(FinanceExpense.user_id == user_id)
                    .where(FinanceExpense.category == limit.category)
                    .where(FinanceExpense.logged_at >= month_start)
                    .where(FinanceExpense.logged_at < month_end)
                )).scalar_one()
                pct = float(spent) / monthly_limit * 100

                if pct >= 100 and limit.alert_100_period != period:
                    limit.alert_100_period = period
                    limit.alert_80_period = period  # don't fire 80% after 100%
                    session.add(limit)
                    alerts.append((limit.category, float(spent), monthly_limit, pct, 100))
                elif 80 <= pct < 100 and limit.alert_80_period != period:
                    limit.alert_80_period = period
                    session.add(limit)
                    alerts.append((limit.category, float(spent), monthly_limit, pct, 80))

            await session.commit()

        for cat, spent, monthly_limit, pct, level in alerts:
            if level == 100:
                title = f"Budget exceeded: {cat}"
                body = f"₹{spent:,.0f} spent of ₹{monthly_limit:,.0f} limit ({pct:.0f}%)"
            else:
                title = f"Budget warning: {cat}"
                body = f"{pct:.0f}% of your ₹{monthly_limit:,.0f} limit used"
            await _broadcast_agent(user_id, {
                "type": "budget_alert", "category": cat, "level": level,
                "spent": spent, "limit": monthly_limit, "pct": round(pct),
            })
            await send_push_to_all(user_id, title, body, "/areas/finance")
            logger.info("Budget alert fired: %s at %.0f%%", cat, pct)
    except Exception as e:
        logger.error("Budget alert check failed: %s", e)
