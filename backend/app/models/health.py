import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, Numeric, UniqueConstraint, ForeignKey
from sqlalchemy.dialects.postgresql import UUID as PG_UUID


class HealthLog(SQLModel, table=True):
    __tablename__ = "health_logs"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    logged_at: datetime = Field(nullable=False)
    entry_type: str = Field(nullable=False)
    value: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(8, 2)))
    unit: Optional[str] = None
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class HealthGoal(SQLModel, table=True):
    """Daily health targets — calories, water, steps, sleep. One row per user."""
    __tablename__ = "health_goals"
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)

    # The primary key IS the user id (as a string) — every call site passes
    # `id=str(current_user.id)`. It carried `default="singleton"` until
    # 2026-08-03, which was a live cross-tenant hazard: any call site that
    # omitted the id would insert the literal "singleton", and since this is
    # the PRIMARY KEY the second user to do so would collide with the first
    # rather than get their own row. No default now, so omitting it fails
    # loudly at the call site instead of silently sharing one user's targets.
    id: str = Field(primary_key=True)
    calorie_target: int = Field(default=2000)
    protein_target: int = Field(default=150)   # grams
    carb_target: int = Field(default=250)      # grams
    fat_target: int = Field(default=65)        # grams
    water_target: int = Field(default=8)       # glasses (250ml each)
    steps_target: int = Field(default=10000)
    sleep_target: float = Field(default=8.0)   # hours
    height_cm: Optional[float] = Field(default=None)  # for BMI calc
    target_weight: Optional[float] = Field(default=None)
    target_workouts_per_week: Optional[int] = Field(default=5)
    target_water_l_per_day: Optional[float] = Field(default=3.0)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class Habit(SQLModel, table=True):
    """Daily habit definition — meditation, reading, etc."""
    __tablename__ = "health_habits"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    icon: Optional[str] = Field(default=None)  # emoji
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class HabitCheck(SQLModel, table=True):
    """One row per habit per completed day.

    Per-user, not the old global `(habit_id, check_date)`: `71fb288f8d09`
    dropped that constraint while adding `user_id` and nothing restored it
    until `h016`. Without it a double-tapped toggle inserts a second row and
    the `scalar_one_or_none()` read in `api/areas/health.py` 500s forever.
    """
    __tablename__ = "health_habit_checks"
    __table_args__ = (
        UniqueConstraint("user_id", "habit_id", "check_date", name="uq_habit_check_user_day"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    habit_id: uuid.UUID = Field(foreign_key="health_habits.id", nullable=False, index=True)
    check_date: str = Field(nullable=False)  # "YYYY-MM-DD"
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class WorkoutRoutine(SQLModel, table=True):
    """A named workout TEMPLATE — "Push Day", "Legs".

    Added 2026-08-03. Until then Health could only record a session after the
    fact, so "plan a routine, then track whether I did it" was unanswerable:
    there was nothing anywhere expressing intent. A routine is the intent; a
    `WorkoutSession` remains the record of what actually happened.
    """
    __tablename__ = "health_workout_routines"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_routine_user_name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class RoutineExercise(SQLModel, table=True):
    """A prescribed exercise inside a routine.

    Targets are all nullable: a routine that just says "Bench press" is a
    legitimate plan, and forcing a target weight on day one would make the
    feature unusable for anyone who does not already know their numbers.
    """
    __tablename__ = "health_routine_exercises"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    routine_id: uuid.UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("health_workout_routines.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    exercise: str = Field(nullable=False)
    target_sets: Optional[int] = Field(default=None)
    target_reps: Optional[int] = Field(default=None)
    target_weight_kg: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(6, 2)))
    position: int = Field(default=0, nullable=False)


class RoutineDay(SQLModel, table=True):
    """Which weekday a routine is meant to happen on. 0 = Monday.

    The weekly pattern is stored, NOT a materialised row per future date. A
    plan is a standing intention; materialising it would mean a job that
    invents rows forever and a decision about how far ahead to invent them.
    Adherence is derived by walking real dates against this pattern instead.
    """
    __tablename__ = "health_routine_days"
    __table_args__ = (UniqueConstraint("routine_id", "weekday", name="uq_routine_day"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    routine_id: uuid.UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("health_workout_routines.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    weekday: int = Field(nullable=False)  # 0=Mon … 6=Sun, matching date.weekday()


class WorkoutSession(SQLModel, table=True):
    """One gym session — holds exercise sets. The record of what happened."""
    __tablename__ = "health_workout_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(default="Workout", nullable=False)  # "Push Day", "Legs"…
    # Which routine this session was doing, when it was doing one. SET NULL,
    # not CASCADE: deleting a routine must not delete the history of having
    # trained it. NULL also legitimately means an unplanned/ad-hoc session.
    routine_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("health_workout_routines.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    logged_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class WorkoutSet(SQLModel, table=True):
    """One set of one exercise within a session."""
    __tablename__ = "health_workout_sets"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    session_id: uuid.UUID = Field(foreign_key="health_workout_sessions.id", nullable=False)
    exercise: str = Field(nullable=False)
    set_number: int = Field(default=1, nullable=False)
    reps: int = Field(nullable=False)
    weight_kg: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(6, 2)))  # null = bodyweight
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class FoodItem(SQLModel, table=True):
    """Food database entry — macros per 100g, optional common serving.

    Uniqueness is PER USER (migration `h013`). It was global on `name` until
    2026-08-03 — created before the table had a `user_id`, and missed by `h008`
    when six sibling tables were swept — which meant the first user to add
    "Roti" would have blocked every other user from ever having one.
    """
    __tablename__ = "health_food_items"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_food_user_name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    calories: float = Field(nullable=False)   # per 100g
    protein: float = Field(default=0)         # g per 100g
    carbs: float = Field(default=0)
    fat: float = Field(default=0)
    serving_desc: Optional[str] = Field(default=None)   # "1 roti", "1 cup"
    serving_grams: Optional[float] = Field(default=None)
    is_custom: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class MealPlan(SQLModel, table=True):
    """A named eating plan — "Cut — 2000 kcal", "Maintenance".

    Added 2026-08-04 alongside workout routines. Nutrition could log what was
    eaten but had no way to express what SHOULD be, so the daily macro targets
    in Health Settings were hand-typed numbers with no relationship to any
    actual food. A plan makes those targets derivable from real portions.
    """
    __tablename__ = "health_meal_plans"
    __table_args__ = (UniqueConstraint("user_id", "name", name="uq_meal_plan_user_name"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    # At most one active plan drives "today's plan". Enforced in the API rather
    # than by a partial unique index, so switching plans stays a plain update.
    is_active: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class MealPlanEntry(SQLModel, table=True):
    """One planned item: this food, this much, this meal, this weekday.

    `food_id` is nullable and paired with `custom_name` — planning "Mum's
    sabzi" must not require adding it to the catalogue first. When a food IS
    linked, macros are read from the catalogue at request time, so correcting
    that food's numbers later fixes every plan that uses it.
    """
    __tablename__ = "health_meal_plan_entries"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    plan_id: uuid.UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("health_meal_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    )
    weekday: int = Field(nullable=False)  # 0=Mon … 6=Sun, matching date.weekday()
    meal_type: str = Field(default="snack", nullable=False)  # breakfast/lunch/dinner/snack
    # SET NULL, not CASCADE: deleting a food must not silently empty the plan.
    # The entry keeps its `custom_name` and degrades to a free-text line.
    food_id: Optional[uuid.UUID] = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), ForeignKey("health_food_items.id", ondelete="SET NULL"), nullable=True, index=True),
    )
    custom_name: Optional[str] = Field(default=None)
    quantity_grams: float = Field(default=100, nullable=False)
    position: int = Field(default=0, nullable=False)
