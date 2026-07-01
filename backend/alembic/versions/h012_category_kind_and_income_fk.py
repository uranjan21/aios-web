"""Category kind (income/expense trees) + income.category_id; drop global name unique

Revision ID: h012
Revises: h011
Create Date: 2026-06-23
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h012"
down_revision: Union[str, None] = "h011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "finance_categories",
        sa.Column("kind", sa.String(), nullable=False, server_default="expense"),
    )
    op.add_column(
        "finance_income",
        sa.Column("category_id", sa.Uuid(), sa.ForeignKey("finance_categories.id"), nullable=True),
    )
    # A global (user_id, name) unique blocks reusing a subcategory name under
    # different parents or across the income/expense trees — uniqueness is now
    # enforced per (user, parent, kind) in the API layer.
    op.drop_constraint("uq_category_user_name", "finance_categories", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint("uq_category_user_name", "finance_categories", ["user_id", "name"])
    op.drop_column("finance_income", "category_id")
    op.drop_column("finance_categories", "kind")
