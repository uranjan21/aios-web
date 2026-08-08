"""Workout routines: templates, prescribed exercises, weekly schedule.

Health could only ever record a session AFTER it happened, so "plan a routine
and track whether I did it" had nothing to compare against — there was no
representation of intent anywhere in the schema.

The weekly pattern lives in `health_routine_days` rather than as materialised
rows per future date. A standing intention does not need a job inventing rows
forever, and adherence is derived by walking real dates against the pattern.

`health_workout_sessions.routine_id` is SET NULL on delete, not CASCADE:
removing a routine must not delete the history of having trained it, and NULL
also legitimately means an ad-hoc session that followed no plan.

Revision ID: h014
Revises: h013
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "h014"
down_revision: Union[str, None] = "h013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_workout_routines",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_routine_user_name"),
    )
    op.create_index("ix_health_workout_routines_user_id", "health_workout_routines", ["user_id"])

    op.create_table(
        "health_routine_exercises",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("routine_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("health_workout_routines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("exercise", sa.String(), nullable=False),
        sa.Column("target_sets", sa.Integer(), nullable=True),
        sa.Column("target_reps", sa.Integer(), nullable=True),
        sa.Column("target_weight_kg", sa.Numeric(6, 2), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_health_routine_exercises_user_id", "health_routine_exercises", ["user_id"])
    op.create_index("ix_health_routine_exercises_routine_id", "health_routine_exercises", ["routine_id"])

    op.create_table(
        "health_routine_days",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("routine_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("health_workout_routines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.UniqueConstraint("routine_id", "weekday", name="uq_routine_day"),
    )
    op.create_index("ix_health_routine_days_user_id", "health_routine_days", ["user_id"])
    op.create_index("ix_health_routine_days_routine_id", "health_routine_days", ["routine_id"])

    op.add_column(
        "health_workout_sessions",
        sa.Column("routine_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_workout_session_routine", "health_workout_sessions", "health_workout_routines",
        ["routine_id"], ["id"], ondelete="SET NULL",
    )
    op.create_index("ix_health_workout_sessions_routine_id", "health_workout_sessions", ["routine_id"])


def downgrade() -> None:
    op.drop_index("ix_health_workout_sessions_routine_id", table_name="health_workout_sessions")
    op.drop_constraint("fk_workout_session_routine", "health_workout_sessions", type_="foreignkey")
    op.drop_column("health_workout_sessions", "routine_id")
    op.drop_table("health_routine_days")
    op.drop_table("health_routine_exercises")
    op.drop_table("health_workout_routines")
