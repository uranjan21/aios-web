"""Meal plans: a named plan and its weekly entries.

Nutrition could record what was eaten but had no way to express what should
be. The daily macro targets on Health Settings were therefore free-floating
numbers — typed by hand, related to no actual food, and impossible to check
against a real portion.

`food_id` is SET NULL on delete rather than CASCADE: removing a food from the
catalogue must not silently delete lines out of a plan. The entry keeps its
`custom_name` and degrades to a free-text line instead.

Revision ID: h015
Revises: h014
Create Date: 2026-08-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "h015"
down_revision: Union[str, None] = "h014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "health_meal_plans",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "name", name="uq_meal_plan_user_name"),
    )
    op.create_index("ix_health_meal_plans_user_id", "health_meal_plans", ["user_id"])

    op.create_table(
        "health_meal_plan_entries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("health_meal_plans.id", ondelete="CASCADE"), nullable=False),
        sa.Column("weekday", sa.Integer(), nullable=False),
        sa.Column("meal_type", sa.String(), nullable=False, server_default="snack"),
        sa.Column("food_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("health_food_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("custom_name", sa.String(), nullable=True),
        sa.Column("quantity_grams", sa.Float(), nullable=False, server_default="100"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_health_meal_plan_entries_user_id", "health_meal_plan_entries", ["user_id"])
    op.create_index("ix_health_meal_plan_entries_plan_id", "health_meal_plan_entries", ["plan_id"])
    op.create_index("ix_health_meal_plan_entries_food_id", "health_meal_plan_entries", ["food_id"])


def downgrade() -> None:
    op.drop_table("health_meal_plan_entries")
    op.drop_table("health_meal_plans")
