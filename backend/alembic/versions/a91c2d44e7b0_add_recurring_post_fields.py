"""Add account_id + last_posted_period to bills and loans for the recurring auto-post engine.

Backfill rule: rows whose due day has already passed this month get
last_posted_period = current month, so the engine does not double-post a bill
the user has likely already logged manually. Rows due later this month stay
NULL and will post when their day arrives.

Revision ID: a91c2d44e7b0
Revises: 7863ebb3c628
Create Date: 2026-06-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'a91c2d44e7b0'
down_revision: Union[str, None] = '7863ebb3c628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('finance_bills', sa.Column('account_id', sa.Uuid(), nullable=True))
    op.add_column('finance_bills', sa.Column('last_posted_period', sa.String(), nullable=True))
    op.create_foreign_key('fk_finance_bills_account_id', 'finance_bills', 'finance_accounts', ['account_id'], ['id'])

    op.add_column('finance_loans', sa.Column('account_id', sa.Uuid(), nullable=True))
    op.add_column('finance_loans', sa.Column('last_posted_period', sa.String(), nullable=True))
    op.create_foreign_key('fk_finance_loans_account_id', 'finance_loans', 'finance_accounts', ['account_id'], ['id'])

    op.execute(
        "UPDATE finance_bills SET last_posted_period = to_char(now(), 'YYYY-MM') "
        "WHERE due_day <= extract(day from now())"
    )
    op.execute(
        "UPDATE finance_loans SET last_posted_period = to_char(now(), 'YYYY-MM') "
        "WHERE emi_day <= extract(day from now())"
    )


def downgrade() -> None:
    op.drop_constraint('fk_finance_loans_account_id', 'finance_loans', type_='foreignkey')
    op.drop_column('finance_loans', 'last_posted_period')
    op.drop_column('finance_loans', 'account_id')

    op.drop_constraint('fk_finance_bills_account_id', 'finance_bills', type_='foreignkey')
    op.drop_column('finance_bills', 'last_posted_period')
    op.drop_column('finance_bills', 'account_id')
