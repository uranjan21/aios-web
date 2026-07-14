import datetime as dt
import logging
import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.core.deps import get_current_user
from app.models.user import User
from app.models.insights import BriefingPreference, Briefing, Insight

router = APIRouter(prefix="/api/insights", tags=["insights"])
logger = logging.getLogger(__name__)

class BriefingPrefUpdate(BaseModel):
    enabled: bool
    deliver_at: dt.time
    channels: Dict[str, Any]
    tz: str

class InsightFeedback(BaseModel):
    feedback: int  # 1 for thumbs up, -1 for thumbs down

@router.get("/briefing/today")
async def get_briefing_today(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    today = dt.datetime.utcnow().date()
    stmt = select(Briefing).where(Briefing.user_id == current_user.id, Briefing.date == today)
    result = await db.execute(stmt)
    briefing = result.scalar_one_or_none()
    
    if not briefing:
        return {"status": "not_generated"}
        
    return {
        "status": "ready",
        "briefing": briefing
    }

@router.post("/briefing/preferences")
async def update_briefing_preferences(
    prefs: BriefingPrefUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    stmt = select(BriefingPreference).where(BriefingPreference.user_id == current_user.id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()
    
    if pref:
        pref.enabled = prefs.enabled
        pref.deliver_at = prefs.deliver_at
        pref.channels = prefs.channels
        pref.tz = prefs.tz
    else:
        pref = BriefingPreference(
            user_id=current_user.id,
            enabled=prefs.enabled,
            deliver_at=prefs.deliver_at,
            channels=prefs.channels,
            tz=prefs.tz
        )
        db.add(pref)
        
    await db.commit()
    await db.refresh(pref)

    # Timezone is the user's single source of truth — propagate it to their
    # agents so scheduled crons fire in the same local time, and live-reschedule
    # the active ones.
    try:
        from app.models.agent import Agent
        from app.services.agents.scheduler import reschedule_agent
        agents = (await db.execute(
            select(Agent).where(Agent.user_id == current_user.id)
        )).scalars().all()
        for agent in agents:
            if agent.tz != prefs.tz:
                agent.tz = prefs.tz
                db.add(agent)
        await db.commit()
        for agent in agents:
            reschedule_agent(agent.task_id, agent.cron_expression, agent.is_active, agent.user_id, agent.tz)
    except Exception as e:
        logger.warning("Failed to propagate tz to agents: %s", e)

    return pref

@router.get("/briefing/preferences")
async def get_briefing_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    stmt = select(BriefingPreference).where(BriefingPreference.user_id == current_user.id)
    result = await db.execute(stmt)
    pref = result.scalar_one_or_none()
    if not pref:
        return {
            "enabled": True,
            "deliver_at": dt.time(8, 0),
            "channels": {"push": True, "email": False},
            "tz": "UTC"
        }
    return pref


@router.get("/discoveries")
async def get_discoveries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    # "kept" (thumbed-up) insights stay in the feed; only dismissed ones drop out.
    stmt = select(Insight).where(
        Insight.user_id == current_user.id,
        Insight.status.in_(["new", "kept"])
    ).order_by(Insight.created_at.desc()).limit(10)
    result = await db.execute(stmt)
    insights = result.scalars().all()
    return insights

@router.post("/discoveries/{insight_id}")
async def update_insight_feedback(
    insight_id: uuid.UUID,
    payload: InsightFeedback,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    stmt = select(Insight).where(Insight.id == insight_id, Insight.user_id == current_user.id)
    result = await db.execute(stmt)
    insight = result.scalar_one_or_none()
    
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")
        
    insight.feedback = payload.feedback
    if payload.feedback < 0:
        insight.status = "dismissed"
    else:
        insight.status = "kept"

    await db.commit()
    await db.refresh(insight)
    return insight


@router.get("/heatmap")
async def get_heatmap(
    days: int = Query(default=180, ge=7, le=366),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Per-day logging counts across all domains → GitHub-style heatmap (plan §7.5)."""
    from app.models.captures import Capture
    from app.models.health import HealthLog
    from app.models.finance import FinanceExpense, FinanceIncome
    from app.models.career import CareerEvent
    from app.models.business import BusinessEvent
    from app.models.content import ContentItem

    start = dt.datetime.utcnow() - dt.timedelta(days=days)
    counts: Dict[str, int] = {}

    sources = [
        (Capture, Capture.created_at),
        (HealthLog, HealthLog.logged_at),
        (FinanceExpense, FinanceExpense.logged_at),
        (FinanceIncome, FinanceIncome.logged_at),
        (CareerEvent, CareerEvent.occurred_at),
        (BusinessEvent, BusinessEvent.created_at),
        (ContentItem, ContentItem.created_at),
    ]
    for model, ts_col in sources:
        rows = (await db.execute(
            select(func.date(ts_col), func.count())
            .where(model.user_id == current_user.id, ts_col >= start)
            .group_by(func.date(ts_col))
        )).all()
        for day, count in rows:
            key = str(day)
            counts[key] = counts.get(key, 0) + int(count)

    # Current streak: consecutive days ending today (or yesterday) with ≥1 log
    streak = 0
    cursor = dt.datetime.utcnow().date()
    if str(cursor) not in counts:
        cursor -= dt.timedelta(days=1)
    while str(cursor) in counts:
        streak += 1
        cursor -= dt.timedelta(days=1)

    return {"days": counts, "streak": streak}


@router.get("/pulse")
async def get_pulse(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_session)
):
    """Plan §5.1.2 Pulse Row — one compact reading per domain with delta + series."""
    from app.models.finance import FinanceExpense
    from app.models.health import HealthLog
    from app.models.career import JobOpportunity
    from app.models.business import BusinessEvent
    from app.models.content import ContentItem

    now = dt.datetime.utcnow()
    today = now.date()
    uid = current_user.id
    tiles: List[Dict[str, Any]] = []

    def _daily_series(rows, days: int = 30) -> list[float]:
        by_day: Dict[str, float] = {}
        for day, val in rows:
            by_day[str(day)] = float(val)
        return [
            by_day.get(str(today - dt.timedelta(days=i)), 0.0)
            for i in range(days - 1, -1, -1)
        ]

    # Finance — spent this month vs same-day last month, 30d daily spend series
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_end = month_start - dt.timedelta(seconds=1)
    prev_month_start = prev_month_end.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_same_day = min(today.day, prev_month_end.day)
    prev_cutoff = prev_month_start + dt.timedelta(days=prev_same_day)

    spent_now = (await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == uid, FinanceExpense.logged_at >= month_start)
    )).scalar_one()
    spent_prev = (await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == uid,
               FinanceExpense.logged_at >= prev_month_start,
               FinanceExpense.logged_at < prev_cutoff)
    )).scalar_one()
    spend_rows = (await db.execute(
        select(func.date(FinanceExpense.logged_at), func.sum(FinanceExpense.amount))
        .where(FinanceExpense.user_id == uid, FinanceExpense.logged_at >= now - dt.timedelta(days=30))
        .group_by(func.date(FinanceExpense.logged_at))
    )).all()
    delta = None
    if float(spent_prev) > 0:
        delta = round((float(spent_now) - float(spent_prev)) / float(spent_prev) * 100)
    tiles.append({
        "domain": "finance", "label": "Spent this month", "value": float(spent_now),
        "unit": "currency", "delta_pct": delta, "delta_good_when": "down",
        "series": _daily_series(spend_rows),
    })

    # Health — gym sessions last 7d vs prior 7d, 30d daily log-count series
    def _count(start: dt.datetime, end: dt.datetime):
        return select(func.count()).where(
            HealthLog.user_id == uid, HealthLog.entry_type == "gym",
            HealthLog.logged_at >= start, HealthLog.logged_at < end,
        )
    gym_7 = (await db.execute(_count(now - dt.timedelta(days=7), now))).scalar_one()
    gym_prev7 = (await db.execute(_count(now - dt.timedelta(days=14), now - dt.timedelta(days=7)))).scalar_one()
    health_rows = (await db.execute(
        select(func.date(HealthLog.logged_at), func.count())
        .where(HealthLog.user_id == uid, HealthLog.logged_at >= now - dt.timedelta(days=30))
        .group_by(func.date(HealthLog.logged_at))
    )).all()
    tiles.append({
        "domain": "health", "label": "Workouts (7d)", "value": int(gym_7),
        "unit": "count",
        "delta_pct": round((gym_7 - gym_prev7) / gym_prev7 * 100) if gym_prev7 else None,
        "delta_good_when": "up",
        "series": _daily_series(health_rows),
    })

    # Career — active pipeline count
    active_opps = (await db.execute(
        select(func.count()).where(
            JobOpportunity.user_id == uid,
            JobOpportunity.status.notin_(["rejected", "closed"]),
        )
    )).scalar_one()
    tiles.append({
        "domain": "career", "label": "Active pipeline", "value": int(active_opps),
        "unit": "count", "delta_pct": None, "delta_good_when": "up", "series": None,
    })

    # Business — latest MRR
    latest_mrr = (await db.execute(
        select(BusinessEvent.mrr).where(
            BusinessEvent.user_id == uid, BusinessEvent.mrr != None,  # noqa: E711
        ).order_by(BusinessEvent.created_at.desc()).limit(1)
    )).scalar_one_or_none()
    tiles.append({
        "domain": "business", "label": "MRR", "value": float(latest_mrr) if latest_mrr is not None else 0.0,
        "unit": "currency", "delta_pct": None, "delta_good_when": "up", "series": None,
    })

    # Content — scheduled queue size
    scheduled = (await db.execute(
        select(func.count()).where(ContentItem.user_id == uid, ContentItem.status.in_(["scheduled", "published"]))
    )).scalar_one()
    tiles.append({
        "domain": "content", "label": "Scheduled", "value": int(scheduled),
        "unit": "count", "delta_pct": None, "delta_good_when": "up", "series": None,
    })

    return tiles
