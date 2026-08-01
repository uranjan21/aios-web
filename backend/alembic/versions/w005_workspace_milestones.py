"""Workspace milestones — dated checkpoints hanging off a goal.

Adds the table behind the redesign's Workspace -> Milestones destination.
`goal_id` is ON DELETE SET NULL on purpose: removing a goal should orphan its
milestones rather than delete dated commitments the user made.

Revision ID: w005_workspace_milestones
Revises: f001_finance_email_ingestion
Create Date: 2026-08-01
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "w005_workspace_milestones"
down_revision = "f001_finance_email_ingestion"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_milestones",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "goal_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("macro_goals.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("description", sa.String(), nullable=True),
        sa.Column("domain", sa.String(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="upcoming"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.create_index("ix_workspace_milestones_user_id", "workspace_milestones", ["user_id"])
    op.create_index("ix_workspace_milestones_goal_id", "workspace_milestones", ["goal_id"])
    op.create_index("ix_workspace_milestones_title", "workspace_milestones", ["title"])
    # The list view is always "this user's milestones, soonest first".
    op.create_index(
        "ix_workspace_milestones_user_due", "workspace_milestones", ["user_id", "due_date"]
    )


def downgrade() -> None:
    op.drop_index("ix_workspace_milestones_user_due", table_name="workspace_milestones")
    op.drop_index("ix_workspace_milestones_title", table_name="workspace_milestones")
    op.drop_index("ix_workspace_milestones_goal_id", table_name="workspace_milestones")
    op.drop_index("ix_workspace_milestones_user_id", table_name="workspace_milestones")
    op.drop_table("workspace_milestones")
