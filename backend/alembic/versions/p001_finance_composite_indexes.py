"""Add composite (user_id, logged_at) indexes on finance transaction tables.

Revision ID: p001_finance_composite_indexes
Revises: ag01_agent_timezone
Create Date: 2026-07-14
"""
from typing import Union
from alembic import op

revision: str = "p001_finance_composite_indexes"
down_revision: Union[str, None] = "ag01_agent_timezone"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # finance_expenses: (user_id, logged_at) speeds up monthly/date-range queries;
    # (user_id, category_id) speeds up category-filter and budget rollup queries.
    op.create_index(
        "ix_finance_expenses_user_logged",
        "finance_expenses",
        ["user_id", "logged_at"],
        unique=False,
    )
    op.create_index(
        "ix_finance_expenses_user_category",
        "finance_expenses",
        ["user_id", "category_id"],
        unique=False,
    )
    op.create_index(
        "ix_finance_expenses_user_account",
        "finance_expenses",
        ["user_id", "account_id"],
        unique=False,
    )

    # finance_income: same composite indexes for income-side queries.
    op.create_index(
        "ix_finance_income_user_logged",
        "finance_income",
        ["user_id", "logged_at"],
        unique=False,
    )
    op.create_index(
        "ix_finance_income_user_category",
        "finance_income",
        ["user_id", "category_id"],
        unique=False,
    )

    # finance_transfers: date-range queries use (user_id, logged_at).
    op.create_index(
        "ix_finance_transfers_user_logged",
        "finance_transfers",
        ["user_id", "logged_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_finance_transfers_user_logged", table_name="finance_transfers")
    op.drop_index("ix_finance_income_user_category", table_name="finance_income")
    op.drop_index("ix_finance_income_user_logged", table_name="finance_income")
    op.drop_index("ix_finance_expenses_user_account", table_name="finance_expenses")
    op.drop_index("ix_finance_expenses_user_category", table_name="finance_expenses")
    op.drop_index("ix_finance_expenses_user_logged", table_name="finance_expenses")
