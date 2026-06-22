"""Add user_id to budget_limits (composite PK)

Revision ID: h001
Revises: c72df91f3c61
Create Date: 2026-06-21 18:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'h001'
down_revision: Union[str, None] = 'c72df91f3c61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop existing PK (category only)
    op.execute('TRUNCATE TABLE budget_limits')
    op.drop_constraint('budget_limits_pkey', 'budget_limits', type_='primary')
    # Add user_id column
    op.add_column('budget_limits', sa.Column('user_id', sa.Uuid(), nullable=False))
    op.create_foreign_key(None, 'budget_limits', 'users', ['user_id'], ['id'])
    op.create_index('ix_budget_limits_user_id', 'budget_limits', ['user_id'], unique=False)
    # New composite PK
    op.create_primary_key('budget_limits_pkey', 'budget_limits', ['user_id', 'category'])


def downgrade() -> None:
    op.execute('TRUNCATE TABLE budget_limits')
    op.drop_constraint('budget_limits_pkey', 'budget_limits', type_='primary')
    op.drop_index('ix_budget_limits_user_id', 'budget_limits')
    op.drop_column('budget_limits', 'user_id')
    op.create_primary_key('budget_limits_pkey', 'budget_limits', ['category'])
