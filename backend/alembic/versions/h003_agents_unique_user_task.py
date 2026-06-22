"""Agents: unique per (user_id, task_id) instead of global task_id

Revision ID: h003
Revises: h002
Create Date: 2026-06-21 20:30:00.000000

Fixes the agents multi-tenancy bug: task_id was globally unique, so two users
could not both own the same default agent (e.g. "aios-morning-brief").
"""
from typing import Sequence, Union
from alembic import op

revision: str = 'h003'
down_revision: Union[str, None] = 'h002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        'ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_task_id_key'
    )
    op.create_unique_constraint(
        'uq_agent_user_task', 'agents', ['user_id', 'task_id']
    )


def downgrade() -> None:
    op.drop_constraint('uq_agent_user_task', 'agents', type_='unique')
    op.create_unique_constraint('agents_task_id_key', 'agents', ['task_id'])
