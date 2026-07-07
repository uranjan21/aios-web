"""workspace: add sprint goals column, cascade FK constraints

Revision ID: w001_workspace_goals_cascade
Revises: 9a468aa9c833
Create Date: 2026-07-06

"""
from typing import Union
import sqlalchemy as sa
from alembic import op

revision: str = 'w001_workspace_goals_cascade'
down_revision: Union[str, None] = '9a468aa9c833'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add goals column to sprints
    op.add_column('sprints', sa.Column('goals', sa.Text(), nullable=True))

    # Drop existing FK constraints and recreate with ON DELETE CASCADE
    # sprints.project_id → projects.id (CASCADE: delete sprint when project deleted)
    op.drop_constraint('sprints_project_id_fkey', 'sprints', type_='foreignkey')
    op.create_foreign_key(
        'sprints_project_id_fkey', 'sprints', 'projects',
        ['project_id'], ['id'], ondelete='CASCADE'
    )

    # tasks.project_id → projects.id (CASCADE: delete task when project deleted)
    op.drop_constraint('tasks_project_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key(
        'tasks_project_id_fkey', 'tasks', 'projects',
        ['project_id'], ['id'], ondelete='CASCADE'
    )

    # tasks.sprint_id → sprints.id (SET NULL: keep task when sprint deleted)
    op.drop_constraint('tasks_sprint_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key(
        'tasks_sprint_id_fkey', 'tasks', 'sprints',
        ['sprint_id'], ['id'], ondelete='SET NULL'
    )


def downgrade() -> None:
    # Revert FK constraints to plain RESTRICT
    op.drop_constraint('tasks_sprint_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key(
        'tasks_sprint_id_fkey', 'tasks', 'sprints', ['sprint_id'], ['id']
    )

    op.drop_constraint('tasks_project_id_fkey', 'tasks', type_='foreignkey')
    op.create_foreign_key(
        'tasks_project_id_fkey', 'tasks', 'projects', ['project_id'], ['id']
    )

    op.drop_constraint('sprints_project_id_fkey', 'sprints', type_='foreignkey')
    op.create_foreign_key(
        'sprints_project_id_fkey', 'sprints', 'projects', ['project_id'], ['id']
    )

    op.drop_column('sprints', 'goals')
