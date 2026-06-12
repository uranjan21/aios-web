"""Add health_workout_sessions + health_workout_sets tables.

Revision ID: e9f4a1b3c6d7
Revises: d8e3f0a2b5c6
Create Date: 2026-06-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e9f4a1b3c6d7'
down_revision: Union[str, None] = 'd8e3f0a2b5c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'health_workout_sessions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('name', sa.String(), nullable=False, server_default='Workout'),
        sa.Column('logged_at', sa.DateTime(), nullable=False),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_table(
        'health_workout_sets',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('session_id', sa.Uuid(), sa.ForeignKey('health_workout_sessions.id'), nullable=False),
        sa.Column('exercise', sa.String(), nullable=False),
        sa.Column('set_number', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('reps', sa.Integer(), nullable=False),
        sa.Column('weight_kg', sa.Numeric(6, 2), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('health_workout_sets')
    op.drop_table('health_workout_sessions')
