"""Plan blocks — the weekly time-blocking planner.

Backs the redesign's Today -> Plan destination. Times are local wall-clock
values, not timestamps: a block is "Tuesday 09:00-10:30 in the user's day", and
storing it as an instant would make it drift when they travel.

Revision ID: w006_plan_blocks
Revises: c002_career_journal
Create Date: 2026-08-01
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "w006_plan_blocks"
down_revision = "c002_career_journal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "plan_blocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("macro_goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("block_date", sa.Date(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("is_priority", sa.Boolean(), nullable=False, server_default=sa.false()),
        # TIMESTAMPTZ to match the tz-aware model defaults — a naive column
        # makes asyncpg reject every insert.
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_plan_blocks_user_id", "plan_blocks", ["user_id"])
    op.create_index("ix_plan_blocks_goal_id", "plan_blocks", ["goal_id"])
    op.create_index("ix_plan_blocks_block_date", "plan_blocks", ["block_date"])
    # Every read is "this user's blocks for a date range, in time order".
    op.create_index(
        "ix_plan_blocks_user_date_time", "plan_blocks", ["user_id", "block_date", "start_time"]
    )


def downgrade() -> None:
    op.drop_index("ix_plan_blocks_user_date_time", table_name="plan_blocks")
    op.drop_index("ix_plan_blocks_block_date", table_name="plan_blocks")
    op.drop_index("ix_plan_blocks_goal_id", table_name="plan_blocks")
    op.drop_index("ix_plan_blocks_user_id", table_name="plan_blocks")
    op.drop_table("plan_blocks")
