"""Deactivate existing Content Strategist agent rows.

The Content area was deleted from the app on 2026-07-21, so the weekly
aios-content-strategist run summarized a domain with no UI while still
burning an LLM call. The task is retired from the default roster in
api/agents.py; this deactivates rows already seeded for existing users
(rows are kept, matching the aios-weekly-refresh precedent).

Revision ID: ag02_deactivate_content_agent
Revises: v001_password_reset
"""
from alembic import op


revision = "ag02_deactivate_content_agent"
down_revision = "v001_password_reset"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE agents SET is_active = false WHERE task_id = 'aios-content-strategist'"
    )


def downgrade() -> None:
    # Prior per-user on/off state is unknowable; leave rows deactivated.
    pass
