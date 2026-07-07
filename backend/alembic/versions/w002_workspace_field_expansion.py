"""workspace: expand fields for project/goal/task (priority, color, due_date, labels)

Revision ID: w002_workspace_field_expansion
Revises: w001_workspace_goals_cascade
Create Date: 2026-07-06
"""
from typing import Union
import sqlalchemy as sa
from alembic import op

revision: str = 'w002_workspace_field_expansion'
down_revision: Union[str, None] = 'w001_workspace_goals_cascade'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Projects: priority, color, due_date, labels
    op.add_column('projects', sa.Column('priority', sa.String(), nullable=True, server_default='medium'))
    op.add_column('projects', sa.Column('color', sa.String(), nullable=True))
    op.add_column('projects', sa.Column('due_date', sa.Date(), nullable=True))
    op.add_column('projects', sa.Column('labels', sa.String(), nullable=True))  # comma-separated

    # Sprints: capacity (story points target)
    op.add_column('sprints', sa.Column('capacity', sa.Integer(), nullable=True))

    # Tasks: labels field (already has description, due_date, domain in model)
    op.add_column('tasks', sa.Column('labels', sa.String(), nullable=True))  # comma-separated

    # Macro goals: priority
    op.add_column('macro_goals', sa.Column('priority', sa.String(), nullable=True, server_default='medium'))


def downgrade() -> None:
    op.drop_column('macro_goals', 'priority')
    op.drop_column('tasks', 'labels')
    op.drop_column('sprints', 'capacity')
    op.drop_column('projects', 'labels')
    op.drop_column('projects', 'due_date')
    op.drop_column('projects', 'color')
    op.drop_column('projects', 'priority')
