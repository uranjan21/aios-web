"""Add split_group_id + tags to expenses, tags to income.

Revision ID: c7d2e9f1a3b4
Revises: b3f1a55c2d10
Create Date: 2026-06-11
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c7d2e9f1a3b4'
down_revision: Union[str, None] = 'b3f1a55c2d10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('finance_expenses', sa.Column('split_group_id', sa.Uuid(), nullable=True))
    op.add_column('finance_expenses', sa.Column('tags', sa.String(), nullable=True))
    op.add_column('finance_income', sa.Column('tags', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('finance_income', 'tags')
    op.drop_column('finance_expenses', 'tags')
    op.drop_column('finance_expenses', 'split_group_id')
