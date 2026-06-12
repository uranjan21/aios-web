"""Add push_subscriptions table + budget alert tracking columns.

Revision ID: b3f1a55c2d10
Revises: a91c2d44e7b0
Create Date: 2026-06-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b3f1a55c2d10'
down_revision: Union[str, None] = 'a91c2d44e7b0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'push_subscriptions',
        sa.Column('id', sa.Uuid(), primary_key=True),
        sa.Column('endpoint', sa.Text(), nullable=False, unique=True),
        sa.Column('p256dh', sa.String(), nullable=False),
        sa.Column('auth', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.add_column('budget_limits', sa.Column('alert_80_period', sa.String(), nullable=True))
    op.add_column('budget_limits', sa.Column('alert_100_period', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('budget_limits', 'alert_100_period')
    op.drop_column('budget_limits', 'alert_80_period')
    op.drop_table('push_subscriptions')
