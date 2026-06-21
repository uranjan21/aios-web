import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text, Numeric


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
    """Daily health targets — calories, water, steps, sleep."""
    __tablename__ = "health_goals"
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)

    id: str = Field(default="singleton", primary_key=True)  # always one row
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
    """One row per habit per completed day."""
    __tablename__ = "health_habit_checks"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    habit_id: uuid.UUID = Field(foreign_key="health_habits.id", nullable=False)
    check_date: str = Field(nullable=False)  # "YYYY-MM-DD"
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class WorkoutSession(SQLModel, table=True):
    """One gym session — holds exercise sets."""
    __tablename__ = "health_workout_sessions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(default="Workout", nullable=False)  # "Push Day", "Legs"…
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
    """Food database entry — macros per 100g, optional common serving."""
    __tablename__ = "health_food_items"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False, unique=True)
    calories: float = Field(nullable=False)   # per 100g
    protein: float = Field(default=0)         # g per 100g
    carbs: float = Field(default=0)
    fat: float = Field(default=0)
    serving_desc: Optional[str] = Field(default=None)   # "1 roti", "1 cup"
    serving_grams: Optional[float] = Field(default=None)
    is_custom: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
