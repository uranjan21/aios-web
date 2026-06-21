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
    query = select(HealthLog).where(HealthLog.user_id == current_user.id).order_by(desc(HealthLog.logged_at))
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
        user_id=current_user.id,
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
        .where(HealthLog.user_id == current_user.id)
        .where(HealthLog.entry_type == "gym")
        .order_by(desc(HealthLog.logged_at))
    )
    gym_logs = result.scalars().all()

    if not gym_logs:
        return {"current_streak": 0, "longest_streak": 0, "last_workout_at": None}

    from datetime import date, timedelta
    dates = sorted({l.logged_at.date() for l in gym_logs}, reverse=True)
    last_workout_at = dates[0].isoformat() if dates else None

    def _count_streak(sorted_dates_desc: list, start_date) -> int:
        streak = 0
        check = start_date
        for d in sorted_dates_desc:
            if d >= check - timedelta(days=1):
                streak += 1
                check = d
            else:
                break
        return streak

    today = date.today()
    current_streak = _count_streak(dates, today)

    longest_streak = 0
    for i, d in enumerate(dates):
        s = _count_streak(dates[i:], d)
        if s > longest_streak:
            longest_streak = s

    return {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_workout_at": last_workout_at,
    }


@router.get("/summary")
async def health_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.user_id == current_user.id)
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
    result = await db.execute(select(HealthGoal).where(HealthGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        goal = HealthGoal(id=str(current_user.id), user_id=current_user.id)
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
    target_weight: Optional[float] = None
    target_workouts_per_week: Optional[int] = None
    target_water_l_per_day: Optional[float] = None


@router.put("/goals")
async def upsert_health_goals(body: HealthGoalUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(HealthGoal).where(HealthGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        goal = HealthGoal(id=str(current_user.id), user_id=current_user.id)
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
        .where(HealthLog.user_id == current_user.id)
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
        .where(HealthLog.user_id == current_user.id)
        .where(HealthLog.entry_type == "water")
        .where(HealthLog.logged_at >= today_start)
    )
    glasses_logged = float(result.scalar_one())

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.user_id == current_user.id))
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
        .where(HealthLog.user_id == current_user.id)
        .where(HealthLog.entry_type == "steps")
        .where(HealthLog.logged_at >= today_start)
    )
    steps_logged = float(result.scalar_one())

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.user_id == current_user.id))
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
        .where(HealthLog.user_id == current_user.id)
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

    goals_result = await db.execute(select(HealthGoal).where(HealthGoal.user_id == current_user.id))
    goal = goals_result.scalar_one_or_none()
    target = goal.sleep_target if goal else 8.0

    return {
        "daily": daily,
        "weekly_avg": weekly_avg,
        "target": target,
        "last_night": daily[-1]["hours"] if daily else None,
    }


# ── Habits ────────────────────────────────────────────────────────────────────
import uuid as _uuid
from datetime import date as _date, timedelta as _timedelta

from fastapi import HTTPException
from app.models.health import Habit, HabitCheck


def _habit_streak(check_dates: set, today: _date) -> int:
    """Consecutive days ending today (or yesterday if today unchecked yet)."""
    streak = 0
    day = today
    if day.isoformat() not in check_dates:
        day = day - _timedelta(days=1)
    while day.isoformat() in check_dates:
        streak += 1
        day = day - _timedelta(days=1)
    return streak


@router.get("/habits")
async def list_habits(current_user=Depends(get_current_user), db=Depends(get_db)):
    habits = (await db.execute(
        select(Habit).where(Habit.user_id == current_user.id, Habit.is_active == True).order_by(Habit.created_at)
    )).scalars().all()
    if not habits:
        return []

    today = datetime.utcnow().date()
    window_start = (today - _timedelta(days=29)).isoformat()
    habit_ids = [h.id for h in habits]

    window_rows = (await db.execute(
        select(HabitCheck).where(
            HabitCheck.habit_id.in_(habit_ids),
            HabitCheck.check_date >= window_start,
        )
    )).scalars().all()
    all_rows = (await db.execute(
        select(HabitCheck.habit_id, HabitCheck.check_date).where(
            HabitCheck.habit_id.in_(habit_ids)
        )
    )).all()

    from collections import defaultdict
    window_by_habit: dict = defaultdict(list)
    for c in window_rows:
        window_by_habit[c.habit_id].append(c.check_date)
    all_by_habit: dict = defaultdict(set)
    for habit_id, check_date in all_rows:
        all_by_habit[habit_id].add(check_date)

    out = []
    for h in habits:
        out.append({
            "id": str(h.id), "name": h.name, "icon": h.icon,
            "streak": _habit_streak(all_by_habit[h.id], today),
            "checks": sorted(window_by_habit[h.id]),
        })
    return out


class HabitCreate(BaseModel):
    name: str
    icon: Optional[str] = None


@router.post("/habits")
async def create_habit(body: HabitCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    habit = Habit(user_id=current_user.id, name=body.name.strip(), icon=body.icon)
    db.add(habit)
    await db.commit()
    await db.refresh(habit)
    return habit


@router.delete("/habits/{habit_id}")
async def delete_habit(habit_id: _uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    habit = (await db.execute(select(Habit).where(Habit.user_id == current_user.id, Habit.id == habit_id))).scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    habit.is_active = False  # soft delete — keeps check history
    db.add(habit)
    await db.commit()
    return {"status": "archived"}


class HabitToggle(BaseModel):
    date: Optional[str] = None  # "YYYY-MM-DD", default today


@router.post("/habits/{habit_id}/toggle")
async def toggle_habit_check(habit_id: _uuid.UUID, body: HabitToggle, current_user=Depends(get_current_user), db=Depends(get_db)):
    day = body.date or datetime.utcnow().date().isoformat()
    existing = (await db.execute(
        select(HabitCheck).where(HabitCheck.user_id == current_user.id, HabitCheck.habit_id == habit_id, HabitCheck.check_date == day)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
        return {"checked": False, "date": day}
    db.add(HabitCheck(user_id=current_user.id, habit_id=habit_id, check_date=day))
    await db.commit()
    return {"checked": True, "date": day}


# ── Workouts (exercise-level) ─────────────────────────────────────────────────
from app.models.health import WorkoutSession, WorkoutSet


@router.get("/workouts")
async def list_workouts(limit: int = 10, current_user=Depends(get_current_user), db=Depends(get_db)):
    sessions = (await db.execute(
        select(WorkoutSession).where(WorkoutSession.user_id == current_user.id).order_by(desc(WorkoutSession.logged_at)).limit(min(limit, 50))
    )).scalars().all()
    out = []
    for s in sessions:
        sets = (await db.execute(
            select(WorkoutSet).where(WorkoutSet.session_id == s.id).order_by(WorkoutSet.created_at)
        )).scalars().all()
        out.append({
            "id": str(s.id), "name": s.name, "logged_at": s.logged_at.isoformat(), "notes": s.notes,
            "sets": [
                {"id": str(x.id), "exercise": x.exercise, "set_number": x.set_number,
                 "reps": x.reps, "weight_kg": float(x.weight_kg) if x.weight_kg is not None else None}
                for x in sets
            ],
        })
    return out


@router.get("/workouts/prs")
async def workout_prs(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Personal records — heaviest set per exercise."""
    sets = (await db.execute(
        select(WorkoutSet).where(WorkoutSet.user_id == current_user.id).where(WorkoutSet.weight_kg != None)
    )).scalars().all()
    best: dict = {}
    for s in sets:
        w = float(s.weight_kg)
        if s.exercise not in best or w > best[s.exercise]["weight_kg"]:
            best[s.exercise] = {"exercise": s.exercise, "weight_kg": w, "reps": s.reps}
    return sorted(best.values(), key=lambda x: -x["weight_kg"])


class WorkoutSetIn(BaseModel):
    exercise: str
    reps: int
    weight_kg: Optional[float] = None


class WorkoutCreate(BaseModel):
    name: str = "Workout"
    logged_at: Optional[datetime] = None
    notes: Optional[str] = None
    sets: list[WorkoutSetIn]


@router.post("/workouts")
async def create_workout(body: WorkoutCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if not body.sets:
        raise HTTPException(status_code=422, detail="At least one set required")
    session_row = WorkoutSession(user_id=current_user.id, name=body.name.strip() or "Workout", logged_at=body.logged_at or datetime.utcnow(), notes=body.notes)
    db.add(session_row)
    await db.flush()

    new_prs = []
    counters: dict = {}
    for s in body.sets:
        ex = s.exercise.strip()
        if not ex or s.reps <= 0:
            continue
        counters[ex] = counters.get(ex, 0) + 1
        db.add(WorkoutSet(user_id=current_user.id, session_id=session_row.id, exercise=ex, set_number=counters[ex], reps=s.reps, weight_kg=s.weight_kg))

    # PR detection vs history (before this session)
    for ex in counters:
        max_new = max((s.weight_kg or 0) for s in body.sets if s.exercise.strip() == ex)
        if max_new <= 0:
            continue
        prev = (await db.execute(
            select(WorkoutSet).where(WorkoutSet.user_id == current_user.id, WorkoutSet.exercise == ex, WorkoutSet.weight_kg != None, WorkoutSet.session_id != session_row.id)
        )).scalars().all()
        prev_best = max((float(p.weight_kg) for p in prev), default=0)
        if max_new > prev_best:
            new_prs.append({"exercise": ex, "weight_kg": max_new, "previous": prev_best or None})

    # Keep the existing gym-streak logic fed (health_logs entry_type='gym')
    db.add(HealthLog(user_id=current_user.id, entry_type="gym", notes=f"{session_row.name} — {len(body.sets)} sets", source="manual",
                     logged_at=session_row.logged_at))

    await db.commit()
    await db.refresh(session_row)
    return {"id": str(session_row.id), "new_prs": new_prs}


@router.delete("/workouts/{workout_id}")
async def delete_workout(workout_id: _uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    session_row = (await db.execute(select(WorkoutSession).where(WorkoutSession.user_id == current_user.id, WorkoutSession.id == workout_id))).scalar_one_or_none()
    if not session_row:
        raise HTTPException(status_code=404, detail="Workout not found")
    for s in (await db.execute(select(WorkoutSet).where(WorkoutSet.session_id == workout_id))).scalars().all():
        await db.delete(s)
    await db.delete(session_row)
    await db.commit()
    return {"status": "deleted"}


# ── Food database ─────────────────────────────────────────────────────────────
from app.models.health import FoodItem


@router.get("/foods")
async def search_foods(q: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(FoodItem).where(FoodItem.user_id == current_user.id).order_by(FoodItem.name).limit(20)
    if q:
        query = select(FoodItem).where(FoodItem.user_id == current_user.id).where(FoodItem.name.ilike(f"%{q}%")).order_by(FoodItem.name).limit(20)
    foods = (await db.execute(query)).scalars().all()
    return foods


class FoodCreate(BaseModel):
    name: str
    calories: float
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    serving_desc: Optional[str] = None
    serving_grams: Optional[float] = None


@router.post("/foods")
async def create_food(body: FoodCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = (await db.execute(select(FoodItem).where(FoodItem.user_id == current_user.id).where(FoodItem.name.ilike(body.name.strip())))).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=409, detail="Food already exists")
    food = FoodItem(
        user_id=current_user.id,
        name=body.name.strip(), calories=body.calories, protein=body.protein,
        carbs=body.carbs, fat=body.fat, serving_desc=body.serving_desc,
        serving_grams=body.serving_grams, is_custom=True,
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food
