import logging
import uuid
import datetime as dt
import calendar

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import Account, FinanceExpense
from app.models.health import HealthLog
from app.models.forecast import Forecast

logger = logging.getLogger(__name__)


def _linreg(points: list[tuple[float, float]]) -> tuple[float, float]:
    """Least-squares slope+intercept for (x, y) points."""
    n = len(points)
    mean_x = sum(p[0] for p in points) / n
    mean_y = sum(p[1] for p in points) / n
    den = sum((p[0] - mean_x) ** 2 for p in points)
    if den == 0:
        return 0.0, mean_y
    slope = sum((p[0] - mean_x) * (p[1] - mean_y) for p in points) / den
    return slope, mean_y - slope * mean_x


async def run_forecasting_pipeline(user_id: uuid.UUID, session) -> int:
    """Plan §7.7 v1: end-of-month balance (linear burn) + 30-day weight trajectory.

    Idempotent per day: skips a metric if a forecast for it was already
    created today. Returns the number of forecasts written.
    """
    today = dt.datetime.utcnow().date()
    day_start = dt.datetime.combine(today, dt.time.min)
    written = 0

    existing_today = {
        f.metric
        for f in (await session.execute(
            select(Forecast).where(Forecast.user_id == user_id, Forecast.created_at >= day_start)
        )).scalars().all()
    }

    # ── Finance: end-of-month balance ────────────────────────────────────
    if "end_of_month_balance" not in existing_today:
        accounts = (await session.execute(
            select(Account).where(Account.user_id == user_id)
        )).scalars().all()
        balance = float(sum(a.balance or 0 for a in accounts))

        start_30 = dt.datetime.utcnow() - dt.timedelta(days=30)
        expenses = (await session.execute(
            select(FinanceExpense).where(
                FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= start_30
            )
        )).scalars().all()

        if accounts and expenses:
            daily_burn = sum(float(e.amount) for e in expenses) / 30.0
            days_in_month = calendar.monthrange(today.year, today.month)[1]
            eom = today.replace(day=days_in_month)
            remaining = (eom - today).days
            predicted = round(balance - daily_burn * remaining, 2)
            spend_days = len({e.logged_at.date() for e in expenses})
            confidence = 0.75 if spend_days >= 10 else (0.55 if spend_days >= 5 else 0.4)
            session.add(Forecast(
                user_id=user_id,
                domain="finance",
                metric="end_of_month_balance",
                target_date=eom,
                predicted_value=predicted,
                confidence=confidence,
                ai_insight=(
                    f"At your ~₹{daily_burn:,.0f}/day burn over the last 30 days, "
                    f"your balance lands around ₹{predicted:,.0f} by month end."
                ),
            ))
            written += 1

    # ── Health: weight in 30 days ────────────────────────────────────────
    if "weight_30d" not in existing_today:
        start_60 = dt.datetime.utcnow() - dt.timedelta(days=60)
        logs = (await session.execute(
            select(HealthLog).where(
                HealthLog.user_id == user_id,
                HealthLog.entry_type == "weight",
                HealthLog.logged_at >= start_60,
                HealthLog.value != None,  # noqa: E711
            ).order_by(HealthLog.logged_at)
        )).scalars().all()

        if len(logs) >= 3 and (logs[-1].logged_at - logs[0].logged_at).days >= 14:
            base = logs[0].logged_at.date()
            points = [((l.logged_at.date() - base).days, float(l.value)) for l in logs]
            slope, intercept = _linreg(points)
            target = today + dt.timedelta(days=30)
            predicted = round(slope * ((target - base).days) + intercept, 1)
            confidence = 0.65 if len(logs) >= 5 else 0.5
            direction = "down" if slope < 0 else "up"
            session.add(Forecast(
                user_id=user_id,
                domain="health",
                metric="weight_30d",
                target_date=target,
                predicted_value=predicted,
                confidence=confidence,
                ai_insight=(
                    f"Your weight trend points {direction} ~{abs(slope * 7):.1f} kg/week — "
                    f"on track for {predicted} kg by {target.isoformat()}."
                ),
            ))
            written += 1

    if written:
        await session.commit()
    return written


async def run_forecast_job() -> None:
    """Nightly job (02:30 UTC): refresh forecasts for every user."""
    from app.models.user import User

    async with AsyncSessionLocal() as session:
        user_ids = [u.id for u in (await session.execute(select(User))).scalars().all()]
    for uid in user_ids:
        try:
            async with AsyncSessionLocal() as session:
                await run_forecasting_pipeline(uid, session)
        except Exception as e:
            logger.error(f"Forecast job failed for user {uid}: {e}")
