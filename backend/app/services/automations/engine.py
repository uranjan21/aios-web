"""Automation template engine (plan §8, v1).

Curated templates only — each is a (check, action) pair executed by an hourly
APScheduler tick. Rules are opt-in rows in `automation_rules`; a rule fires at
most once per its cooldown window (tracked via `last_fired_at`). All actions
are notifications or safe writes — never destructive.
"""

import logging
import uuid
import datetime as dt
from zoneinfo import ZoneInfo

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.automations import AutomationRule
from app.models.insights import BriefingPreference
from app.services.notifications.push import send_push_to_all

logger = logging.getLogger(__name__)

_DAY = dt.timedelta(hours=20)      # "once a day" cooldown, tolerant of tick jitter
_WEEK = dt.timedelta(days=6)


async def _user_localtime(session, user_id: uuid.UUID) -> dt.datetime:
    pref = (await session.execute(
        select(BriefingPreference).where(BriefingPreference.user_id == user_id)
    )).scalar_one_or_none()
    try:
        tz = ZoneInfo(pref.tz) if pref and pref.tz else dt.timezone.utc
    except Exception:
        tz = dt.timezone.utc
    return dt.datetime.now(dt.timezone.utc).astimezone(tz)


async def _bill_reminder_3d(session, rule: AutomationRule) -> bool:
    from app.models.finance import FinanceBill

    local = await _user_localtime(session, rule.user_id)
    if local.hour < 9:  # don't ping before morning
        return False
    due_day = (local.date() + dt.timedelta(days=3)).day
    bills = (await session.execute(
        select(FinanceBill).where(
            FinanceBill.user_id == rule.user_id,
            FinanceBill.is_active == True,  # noqa: E712
            FinanceBill.due_day == due_day,
        )
    )).scalars().all()
    if not bills:
        return False
    total = sum(float(b.amount) for b in bills)
    names = ", ".join(b.name for b in bills[:3])
    await send_push_to_all(
        rule.user_id, "📅 Bills due in 3 days",
        f"{names} — ₹{total:,.0f} total. Make sure the account is funded.",
        "/app/areas/finance",
    )
    return True


async def _streak_save_evening(session, rule: AutomationRule) -> bool:
    from app.models.captures import Capture
    from app.models.health import HealthLog
    from app.models.finance import FinanceExpense

    local = await _user_localtime(session, rule.user_id)
    if local.hour < 20:  # evening nudge only
        return False
    day_start_local = local.replace(hour=0, minute=0, second=0, microsecond=0)
    day_start = day_start_local.astimezone(dt.timezone.utc).replace(tzinfo=None)

    for model, ts in ((Capture, Capture.created_at), (HealthLog, HealthLog.logged_at), (FinanceExpense, FinanceExpense.logged_at)):
        row = (await session.execute(
            select(model.id).where(model.user_id == rule.user_id, ts >= day_start).limit(1)
        )).first()
        if row:
            return False  # already logged today — streak safe

    await send_push_to_all(
        rule.user_id, "🔥 Keep your streak alive",
        "Nothing logged today yet — one quick entry keeps the heatmap green.",
        "/app",
    )
    return True


async def _weekly_review_sunday(session, rule: AutomationRule) -> bool:
    local = await _user_localtime(session, rule.user_id)
    if local.weekday() != 6 or local.hour < 17:  # Sunday evening
        return False
    await send_push_to_all(
        rule.user_id, "🗓️ Your week is ready to review",
        "Check in on your goals and pick next week's three focus items.",
        "/app/review",
    )
    return True


async def _payday_snapshot(session, rule: AutomationRule) -> bool:
    from app.models.finance import FinanceIncome, FinanceSnapshot

    since = dt.datetime.utcnow() - dt.timedelta(hours=24)
    incomes = (await session.execute(
        select(FinanceIncome).where(
            FinanceIncome.user_id == rule.user_id,
            FinanceIncome.logged_at >= since,
        )
    )).scalars().all()
    salary = [i for i in incomes if "salary" in (i.source or "").lower()]
    if not salary:
        return False

    month_start = dt.datetime.utcnow().date().replace(day=1)
    existing = (await session.execute(
        select(FinanceSnapshot).where(
            FinanceSnapshot.user_id == rule.user_id,
            FinanceSnapshot.snapshot_month == month_start,
        )
    )).scalar_one_or_none()
    amount = sum(float(s.amount) for s in salary)
    if existing:
        existing.take_home = amount
    else:
        session.add(FinanceSnapshot(
            user_id=rule.user_id, snapshot_month=month_start, take_home=amount,
        ))
    await session.commit()
    await send_push_to_all(
        rule.user_id, "💰 Payday snapshot recorded",
        f"₹{amount:,.0f} take-home logged for {month_start.strftime('%B')}.",
        "/app/areas/finance",
    )
    return True


async def _idle_goal_nudge_7d(session, rule: AutomationRule) -> bool:
    from app.models.goal import MacroGoal, GoalProgress

    goals = (await session.execute(
        select(MacroGoal).where(MacroGoal.user_id == rule.user_id, MacroGoal.status == "active")
    )).scalars().all()
    if not goals:
        return False
    cutoff = dt.datetime.utcnow() - dt.timedelta(days=7)
    stale = []
    for g in goals:
        recent = (await session.execute(
            select(GoalProgress.id).where(
                GoalProgress.goal_id == g.id, GoalProgress.created_at >= cutoff
            ).limit(1)
        )).first()
        if not recent:
            stale.append(g)
    if not stale:
        return False
    await send_push_to_all(
        rule.user_id, "🎯 Goals waiting on you",
        f"\"{stale[0].title}\"{f' and {len(stale) - 1} more' if len(stale) > 1 else ''} had no check-in this week.",
        "/app/goals",
    )
    return True


# template_key -> (handler, cooldown). budget_80_push has no tick handler —
# it's event-driven inside services/finance/budget_alerts.py, which consults
# is_rule_enabled() before pushing.
TEMPLATES = {
    "bill_reminder_3d": (_bill_reminder_3d, _DAY),
    "streak_save_evening": (_streak_save_evening, _DAY),
    "weekly_review_sunday": (_weekly_review_sunday, _WEEK),
    "payday_snapshot": (_payday_snapshot, _DAY),
    "idle_goal_nudge_7d": (_idle_goal_nudge_7d, _WEEK),
}


async def is_rule_enabled(session, user_id: uuid.UUID, template_key: str, default: bool = True) -> bool:
    """Event-driven templates call this at their trigger site. No row = default."""
    rule = (await session.execute(
        select(AutomationRule).where(
            AutomationRule.user_id == user_id, AutomationRule.template_key == template_key
        )
    )).scalar_one_or_none()
    return rule.enabled if rule else default


async def run_automation_tick() -> None:
    """Hourly: evaluate every enabled scheduled rule whose cooldown has lapsed."""
    async with AsyncSessionLocal() as session:
        rules = (await session.execute(
            select(AutomationRule).where(AutomationRule.enabled == True)  # noqa: E712
        )).scalars().all()

    now = dt.datetime.utcnow()
    for rule in rules:
        entry = TEMPLATES.get(rule.template_key)
        if not entry:
            continue
        handler, cooldown = entry
        if rule.last_fired_at and now - rule.last_fired_at < cooldown:
            continue
        try:
            async with AsyncSessionLocal() as session:
                fired = await handler(session, rule)
                if fired:
                    db_rule = (await session.execute(
                        select(AutomationRule).where(AutomationRule.id == rule.id)
                    )).scalar_one_or_none()
                    if db_rule:
                        db_rule.last_fired_at = now
                        db_rule.updated_at = now
                        await session.commit()
        except Exception as e:
            logger.error(f"Automation {rule.template_key} failed for user {rule.user_id}: {e}")
