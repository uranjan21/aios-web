"""Career: learning resources and employment history.

Career could record that learning HAPPENED — a `CareerEvent` row with
`event_type="learning"`, a dated line of text — but not what was being
learned, how far through it you were, or whether it ever finished. And there
was no employment model at all, so job history, titles and tenure lived
nowhere: the CV facts the area exists to track were the ones it could not hold.

`career_learning_resources.skill_id` is SET NULL on delete rather than
CASCADE — removing a skill must not delete the record of having studied for
it. The link is what turns `SkillInventory.level = 'day_0'` ("want to learn")
from a label into a plan.

`career_employment_roles` has NO `is_current` flag. `end_date IS NULL` is the
single representation of a current role; a boolean beside it would be a second
source of truth that drifts the moment one is updated without the other.

Revision ID: c003
Revises: h015
Create Date: 2026-08-04
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c003"
down_revision: Union[str, None] = "h015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "career_learning_resources",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("kind", sa.String(), nullable=False, server_default="course"),
        sa.Column("provider", sa.String(), nullable=True),
        sa.Column("url", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="planned"),
        sa.Column("progress_pct", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("skill_inventory.id", ondelete="SET NULL"), nullable=True),
        sa.Column("started_at", sa.Date(), nullable=True),
        sa.Column("completed_at", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_career_learning_resources_user_id", "career_learning_resources", ["user_id"])
    op.create_index("ix_career_learning_resources_skill_id", "career_learning_resources", ["skill_id"])

    op.create_table(
        "career_employment_roles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("company", sa.String(), nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("employment_type", sa.String(), nullable=False, server_default="full_time"),
        sa.Column("location", sa.String(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_career_employment_roles_user_id", "career_employment_roles", ["user_id"])


def downgrade() -> None:
    op.drop_table("career_employment_roles")
    op.drop_table("career_learning_resources")
