from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.health import HealthLog, HealthGoal

router = APIRouter(prefix="/api/areas/health", tags=["health"])


@router.get("/logs")
async def list_logs(
    entry_type: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = select(HealthLog).order_by(desc(HealthLog.logged_at))
    if entry_type:
        query = query.where(HealthLog.entry_type == entry_type)
    query = query.limit(200)
    result = await db.execute(query)
    return result.scalars().all()


class HealthLogCreate(BaseModel):
    entry_type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/logs")
async def create_log(body: HealthLogCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    log = HealthLog(
        logged_at=body.logged_at or datetime.utcnow(),
        entry_type=body.entry_type,
        value=body.value,
        unit=body.unit,
        notes=body.notes,
        source="manual",
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/streak")
async def gym_streak(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "gym")
        .order_by(desc(HealthLog.logged_at))
        .limit(100)
    )
    gym_logs = result.scalars().all()

    if not gym_logs:
        return {"current_streak": 0, "longest_streak": 0, "last_workout_at": None}

    from datetime import date, timedelta
    dates = sorted({l.logged_at.date() for l in gym_logs}, reverse=True)
    last_workout_at = dates[0].isoformat() if dates else None

    current_streak = 0
    today = date.today()
    check = today
    for d in dates:
        if d >= check - timedelta(days=1):
            current_streak += 1
            check = d
        else:
            break

    return {
        "current_streak": current_streak,
        "longest_streak": current_streak,  # simplified
        "last_workout_at": last_workout_at,
    }


@router.get("/summary")
async def health_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "weight")
        .order_by(desc(HealthLog.logged_at))
        .limit(1)
    )
    latest_weight = result.scalar_one_or_none()
    return {
        "weight": float(latest_weight.value) if latest_weight and latest_weight.value else None,
        "weight_unit": latest_weight.unit if latest_weight else "kg",
        "last_measured_at": latest_weight.logged_at.isoformat() if latest_weight else None,
    }


# ── Health Goals ────────────────────────────────────────────

@router.get("/goals")
async def get_health_goals(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(HealthGoal).where(HealthGoal.id == "singleton"))
    goal = result.scalar_one_or_none()
    if not goal:
        goal = HealthGoal()
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
    return goal


class HealthGoalUpdate(BaseModel):
    calorie_target: Optional[int] = None
    protein_target: Optional[int] = None
    carb_target: Optional[int] = None
    fat_target: Optional[int] = None
    water_target: Optional[int] = None
    steps_target: Optional[int] = None
    sleep_target: Optional[float] = None
    height_cm: Optional[float] = None


@router.put("/goals")
async def upsert_health_goals(body: HealthGoalUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(HealthGoal).where(HealthGoal.id == "singleton"))
    goal = result.scalar_one_or_none()
    if not goal:
        goal = HealthGoal()
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


# ── Nutrition today ────────────────────────────────────────────

@router.get("/nutrition/today")
async def nutrition_today(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "meal")
        .where(HealthLog.logged_at >= today_start)
        .order_by(HealthLog.logged_at)
    )
    meals = result.scalars().all()

    calories = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0
    meal_list = []
    for m in meals:
        notes_data: dict = {}
        if m.notes:
            import json
            try:
                notes_data = json.loads(m.notes)
            except Exception:
                pass
        cal = float(notes_data.get("calories", m.value or 0))
        calories += cal
        protein += float(notes_data.get("protein", 0))
        carbs += float(notes_data.get("carbs", 0))
        fat += float(notes_data.get("fat", 0))
        meal_list.append({
            "id": str(m.id),
            "logged_at": m.logged_at.isoformat(),
            "calories": cal,
            "notes": m.notes,
        })

    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "meals": meal_list,
    }


# ── Water today ────────────────────────────────────────────

@router.get("/water/today")
async def water_today(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.coalesce(func.sum(HealthLog.value), 0))
        .where(HealthLog.entry_type == "water")
        .where(HealthLog.logged_at >= today_start)
    )
    glasses_logged = float(result.scalar_one())

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.id == "singleton"))
    goal = goals_result.scalar_one_or_none()
    target = goal.water_target if goal else 8

    return {"glasses_logged": glasses_logged, "target": target}


# ── Steps today ────────────────────────────────────────────

@router.get("/steps/today")
async def steps_today(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.coalesce(func.sum(HealthLog.value), 0))
        .where(HealthLog.entry_type == "steps")
        .where(HealthLog.logged_at >= today_start)
    )
    steps_logged = float(result.scalar_one())

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.id == "singleton"))
    goal = goals_result.scalar_one_or_none()
    target = goal.steps_target if goal else 10000

    return {"steps_logged": steps_logged, "target": target}


# ── Sleep recent (last 7 days) ────────────────────────────────────────────

@router.get("/sleep/recent")
async def sleep_recent(current_user=Depends(get_current_user), db=Depends(get_db)):
    from datetime import timedelta
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "sleep")
        .where(HealthLog.logged_at >= seven_days_ago)
        .order_by(HealthLog.logged_at)
    )
    logs = result.scalars().all()

    by_day: dict[str, dict] = {}
    for l in logs:
        d = l.logged_at.date().isoformat()
        by_day[d] = {"date": d, "hours": float(l.value or 0), "quality": l.notes}

    daily = list(by_day.values())
    weekly_avg = round(sum(d["hours"] for d in daily) / len(daily), 1) if daily else 0.0

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.id == "singleton"))
    goal = goals_result.scalar_one_or_none()
    target = goal.sleep_target if goal else 8.0

    return {
        "daily": daily,
        "weekly_avg": weekly_avg,
        "target": target,
        "last_night": daily[-1]["hours"] if daily else None,
    }
