"""Add health_habits + health_habit_checks tables.

Revision ID: d8e3f0a2b5c6
Revises: c7d2e9f1a3b4
Create Date: 2026-06-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'd8e3f0a2b5c6'
down_revision: Union[str, None] = 'c7d2e9f1a3b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'health_habits',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('icon', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'health_habit_checks',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('habit_id', sa.Uuid(), sa.ForeignKey('health_habits.id'), nullable=False),
        sa.Column('check_date', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('habit_id', 'check_date', name='uq_habit_check_day'),
    )


def downgrade() -> None:
    op.drop_table('health_habit_checks')
    op.drop_table('health_habits')
