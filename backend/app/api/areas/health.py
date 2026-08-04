from datetime import datetime, timezone
from typing import Optional, Annotated
from fastapi import APIRouter, Depends
from pydantic import BaseModel, AfterValidator
from sqlmodel import select, desc

def _to_naive_utc(v: Optional[datetime]) -> Optional[datetime]:
    if v is None: return None
    if v.tzinfo is not None:
        return v.astimezone(timezone.utc).replace(tzinfo=None)
    return v

NaiveDateTime = Annotated[Optional[datetime], AfterValidator(_to_naive_utc)]

from app.core.deps import get_current_user, get_db
from app.models.health import HealthLog, HealthGoal

router = APIRouter(prefix="/api/areas/health", tags=["health"])


@router.get("/logs")
async def list_logs(
    entry_type: Optional[str] = None,
    before: Optional[datetime] = None,
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """List health logs with cursor-based pagination.

    Pass `before=<iso-datetime>` to fetch the next page of older entries.
    Returns up to `limit` (max 100) items and a `next_cursor` for the next page.
    """
    limit = min(limit, 100)
    query = (
        select(HealthLog)
        .where(HealthLog.user_id == current_user.id)
        .order_by(desc(HealthLog.logged_at))
        .limit(limit + 1)  # fetch one extra to detect next page
    )
    if entry_type:
        query = query.where(HealthLog.entry_type == entry_type)
    if before:
        before_naive = before.astimezone(timezone.utc).replace(tzinfo=None) if before.tzinfo else before
        query = query.where(HealthLog.logged_at < before_naive)

    result = await db.execute(query)
    rows = result.scalars().all()

    has_more = len(rows) > limit
    page = rows[:limit]
    next_cursor = page[-1].logged_at.isoformat() if has_more and page else None
    return {"items": page, "next_cursor": next_cursor, "has_more": has_more}


class HealthLogCreate(BaseModel):
    entry_type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    logged_at: NaiveDateTime = None


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
    owned = (await db.execute(
        select(Habit.id).where(Habit.id == habit_id, Habit.user_id == current_user.id)
    )).scalar_one_or_none()
    if owned is None:
        raise HTTPException(status_code=404, detail="Habit not found")

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
    logged_at: NaiveDateTime = None
    notes: Optional[str] = None
    # Which routine this session was doing. Optional on purpose: an ad-hoc
    # session is real training and must still be loggable without a plan.
    routine_id: Optional[_uuid.UUID] = None
    sets: list[WorkoutSetIn]


@router.post("/workouts")
async def create_workout(body: WorkoutCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if not body.sets:
        raise HTTPException(status_code=422, detail="At least one set required")

    if body.routine_id is not None:
        from app.models.health import WorkoutRoutine as _Routine
        owned = (await db.execute(
            select(_Routine)
            .where(_Routine.user_id == current_user.id)
            .where(_Routine.id == body.routine_id)
        )).scalars().first()
        if not owned:
            raise HTTPException(status_code=404, detail="Routine not found")

    session_row = WorkoutSession(user_id=current_user.id, name=body.name.strip() or "Workout", logged_at=body.logged_at or datetime.utcnow(), notes=body.notes, routine_id=body.routine_id)
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
from fastapi import HTTPException
from app.models.health import FoodItem
from app.services.health.foods_seed import BASE_FOODS


async def _seed_base_foods(db, user_id) -> None:
    """Give a user their own copy of the base catalogue.

    Lazy, on first fetch — the same shape as finance's category auto-seed. The
    table was seeded once by migration `f0a5b2c4d7e8` and then TRUNCATEd by
    `71fb288f8d09` when `user_id` was added, so every user has had an empty
    food database since; this is what refills it.
    """
    for name, kcal, protein, carbs, fat, serving_desc, serving_grams in BASE_FOODS:
        db.add(FoodItem(
            user_id=user_id, name=name, calories=kcal, protein=protein,
            carbs=carbs, fat=fat, serving_desc=serving_desc,
            serving_grams=serving_grams, is_custom=False,
        ))


@router.get("/foods")
async def search_foods(q: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    base = select(FoodItem).where(FoodItem.user_id == current_user.id)

    existing = (await db.execute(base.limit(1))).scalars().first()
    if existing is None:
        await _seed_base_foods(db, current_user.id)
        await db.commit()

    query = base
    if q:
        query = query.where(FoodItem.name.ilike(f"%{q.strip()}%"))
    # Custom entries first so a user's own version of a food outranks the base
    # one when both match.
    query = query.order_by(desc(FoodItem.is_custom), FoodItem.name).limit(25)
    return (await db.execute(query)).scalars().all()


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
    """Add a custom food. Declared since 2026-06 but never routed until now —
    `FoodCreate` sat in this file with no endpoint, so the catalogue was
    read-only against an empty table."""
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    if body.calories < 0:
        raise HTTPException(status_code=422, detail="Calories cannot be negative")

    dupe = (await db.execute(
        select(FoodItem)
        .where(FoodItem.user_id == current_user.id)
        .where(FoodItem.name.ilike(name))
    )).scalars().first()
    if dupe:
        raise HTTPException(status_code=409, detail=f"'{name}' is already in your food list")

    food = FoodItem(
        user_id=current_user.id, name=name, calories=body.calories,
        protein=body.protein, carbs=body.carbs, fat=body.fat,
        serving_desc=body.serving_desc, serving_grams=body.serving_grams,
        is_custom=True,
    )
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


@router.delete("/foods/{food_id}")
async def delete_food(food_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    food = (await db.execute(
        select(FoodItem)
        .where(FoodItem.user_id == current_user.id)
        .where(FoodItem.id == food_id)
    )).scalars().first()
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    await db.delete(food)
    await db.commit()
    return {"status": "deleted"}




# ── Workout routines (the plan) ────────────────────────────────────────────────
# Health could only ever record a session after the fact. These endpoints add
# the intent side — a named routine, its prescribed exercises, and which
# weekdays it is meant to happen on — so adherence becomes answerable.
from app.models.health import WorkoutRoutine, RoutineExercise, RoutineDay

WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


class RoutineExerciseIn(BaseModel):
    exercise: str
    target_sets: Optional[int] = None
    target_reps: Optional[int] = None
    target_weight_kg: Optional[float] = None


class RoutineIn(BaseModel):
    name: str
    notes: Optional[str] = None
    is_active: bool = True
    # 0 = Monday, matching date.weekday().
    days: list[int] = []
    exercises: list[RoutineExerciseIn] = []


async def _routine_payload(db, routine: WorkoutRoutine) -> dict:
    exercises = (await db.execute(
        select(RoutineExercise)
        .where(RoutineExercise.routine_id == routine.id)
        .order_by(RoutineExercise.position)
    )).scalars().all()
    days = (await db.execute(
        select(RoutineDay).where(RoutineDay.routine_id == routine.id).order_by(RoutineDay.weekday)
    )).scalars().all()
    return {
        "id": str(routine.id),
        "name": routine.name,
        "notes": routine.notes,
        "is_active": routine.is_active,
        "days": [d.weekday for d in days],
        "exercises": [
            {
                "id": str(e.id), "exercise": e.exercise,
                "target_sets": e.target_sets, "target_reps": e.target_reps,
                "target_weight_kg": float(e.target_weight_kg) if e.target_weight_kg is not None else None,
            }
            for e in exercises
        ],
    }


async def _replace_routine_children(db, user_id, routine: WorkoutRoutine, body: RoutineIn) -> None:
    """Children are replaced wholesale — the editor always sends the full list,
    and diffing rows the client never identifies would invent ids it cannot
    send back."""
    for e in (await db.execute(select(RoutineExercise).where(RoutineExercise.routine_id == routine.id))).scalars().all():
        await db.delete(e)
    for d in (await db.execute(select(RoutineDay).where(RoutineDay.routine_id == routine.id))).scalars().all():
        await db.delete(d)
    await db.flush()

    for i, ex in enumerate(body.exercises):
        name = ex.exercise.strip()
        if not name:
            continue
        db.add(RoutineExercise(
            user_id=user_id, routine_id=routine.id, exercise=name, position=i,
            target_sets=ex.target_sets, target_reps=ex.target_reps,
            target_weight_kg=ex.target_weight_kg,
        ))
    for wd in sorted(set(body.days)):
        if 0 <= wd <= 6:
            db.add(RoutineDay(user_id=user_id, routine_id=routine.id, weekday=wd))


@router.get("/routines")
async def list_routines(current_user=Depends(get_current_user), db=Depends(get_db)):
    routines = (await db.execute(
        select(WorkoutRoutine).where(WorkoutRoutine.user_id == current_user.id).order_by(WorkoutRoutine.name)
    )).scalars().all()
    return [await _routine_payload(db, r) for r in routines]


@router.post("/routines")
async def create_routine(body: RoutineIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    dupe = (await db.execute(
        select(WorkoutRoutine)
        .where(WorkoutRoutine.user_id == current_user.id)
        .where(WorkoutRoutine.name.ilike(name))
    )).scalars().first()
    if dupe:
        raise HTTPException(status_code=409, detail=f"You already have a routine called '{name}'")

    routine = WorkoutRoutine(user_id=current_user.id, name=name, notes=body.notes, is_active=body.is_active)
    db.add(routine)
    await db.flush()
    await _replace_routine_children(db, current_user.id, routine, body)
    await db.commit()
    await db.refresh(routine)
    return await _routine_payload(db, routine)


@router.patch("/routines/{routine_id}")
async def update_routine(routine_id: _uuid.UUID, body: RoutineIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    routine = (await db.execute(
        select(WorkoutRoutine)
        .where(WorkoutRoutine.user_id == current_user.id)
        .where(WorkoutRoutine.id == routine_id)
    )).scalars().first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")

    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Name is required")
    clash = (await db.execute(
        select(WorkoutRoutine)
        .where(WorkoutRoutine.user_id == current_user.id)
        .where(WorkoutRoutine.name.ilike(name))
        .where(WorkoutRoutine.id != routine_id)
    )).scalars().first()
    if clash:
        raise HTTPException(status_code=409, detail=f"You already have a routine called '{name}'")

    routine.name = name
    routine.notes = body.notes
    routine.is_active = body.is_active
    db.add(routine)
    await _replace_routine_children(db, current_user.id, routine, body)
    await db.commit()
    await db.refresh(routine)
    return await _routine_payload(db, routine)


@router.delete("/routines/{routine_id}")
async def delete_routine(routine_id: _uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    routine = (await db.execute(
        select(WorkoutRoutine)
        .where(WorkoutRoutine.user_id == current_user.id)
        .where(WorkoutRoutine.id == routine_id)
    )).scalars().first()
    if not routine:
        raise HTTPException(status_code=404, detail="Routine not found")
    # Exercises and days cascade. Sessions do NOT — their routine_id goes NULL,
    # so the history of having trained this survives the routine's deletion.
    await db.delete(routine)
    await db.commit()
    return {"status": "deleted"}


@router.get("/workouts/adherence")
async def workout_adherence(days: int = 28, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Planned vs done, day by day, over the trailing window.

    This is the question the area could not answer at all before routines
    existed: not "how much did I train" (the streak already said that) but
    "did I do what I said I would".

    A day is derived, never stored — `health_routine_days` holds a standing
    weekly pattern, so the expected set for any date is whatever routines name
    that weekday. Sessions are matched to a routine by `routine_id` when they
    carry one; a session with no routine is still real training and is reported
    as `unplanned` rather than dropped, because a plan the user improvised
    around is not the same as a plan they ignored.

    Days BEFORE a routine existed are not counted against it — a routine
    created today has not been missed all month.
    """
    from datetime import date, timedelta

    days = max(7, min(120, days))
    today = date.today()
    start = today - timedelta(days=days - 1)

    routines = (await db.execute(
        select(WorkoutRoutine)
        .where(WorkoutRoutine.user_id == current_user.id)
        .where(WorkoutRoutine.is_active == True)  # noqa: E712
    )).scalars().all()
    by_id = {r.id: r for r in routines}

    routine_days = (await db.execute(
        select(RoutineDay).where(RoutineDay.user_id == current_user.id)
    )).scalars().all()
    # weekday -> [routine, …]
    plan: dict[int, list] = {}
    for rd in routine_days:
        routine = by_id.get(rd.routine_id)
        if routine:
            plan.setdefault(rd.weekday, []).append(routine)

    sessions = (await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == current_user.id)
        .where(WorkoutSession.logged_at >= datetime.combine(start, datetime.min.time()))
    )).scalars().all()

    done_by_day: dict[date, list] = {}
    for s in sessions:
        done_by_day.setdefault(s.logged_at.date(), []).append(s)

    out_days = []
    planned_total = 0
    completed_total = 0
    for i in range(days):
        d = start + timedelta(days=i)
        expected = [
            r for r in plan.get(d.weekday(), [])
            # A routine cannot have been missed before it was created.
            if r.created_at.date() <= d
        ]
        todays = done_by_day.get(d, [])
        done_routine_ids = {s.routine_id for s in todays if s.routine_id}

        expected_ids = {r.id for r in expected}
        hit = [r for r in expected if r.id in done_routine_ids]
        missed = [r for r in expected if r.id not in done_routine_ids]
        # Two different things, deliberately not merged: training that followed
        # no routine at all, versus a real routine done on a day it was not
        # scheduled for. Calling the second "unplanned" would tell a user who
        # moved leg day to Sunday that they went off-plan, which is not true.
        unplanned = [s for s in todays if not s.routine_id]
        off_schedule = [
            s for s in todays
            if s.routine_id and s.routine_id not in expected_ids
        ]

        planned_total += len(expected)
        completed_total += len(hit)

        out_days.append({
            "date": d.isoformat(),
            "weekday": d.weekday(),
            "planned": [{"id": str(r.id), "name": r.name} for r in expected],
            "completed": [{"id": str(r.id), "name": r.name} for r in hit],
            # Only days already past can be "missed"; today is still open.
            "missed": [{"id": str(r.id), "name": r.name} for r in missed] if d < today else [],
            "unplanned": [{"id": str(s.id), "name": s.name} for s in unplanned],
            "off_schedule": [
                {"id": str(s.id), "name": by_id[s.routine_id].name if s.routine_id in by_id else s.name}
                for s in off_schedule
            ],
            "is_future": d > today,
        })

    return {
        "days": out_days,
        "planned_total": planned_total,
        "completed_total": completed_total,
        # NULL, not 0, when nothing was ever planned — "0% adherence" would
        # accuse a user with no routines of failing at something.
        "adherence_pct": round(completed_total / planned_total * 100, 1) if planned_total else None,
        "window_days": days,
    }
