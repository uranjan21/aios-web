"""health_food_items: per-user name uniqueness, not global.

`f0a5b2c4d7e8` created the table with `name` UNIQUE before the table had a
`user_id` at all. `71fb288f8d09` then added `user_id` (and TRUNCATEd the rows),
and `h008` swept six other tables from global to per-user uniques — but missed
this one. So the constraint survived as a cross-tenant collision: the first
user to create "Roti" would block every other user from ever having one.

It has been latent rather than live only because the table has been empty and
had no write endpoint since the truncate.

Revision ID: h013
Revises: dc01_finance_departures
Create Date: 2026-08-03
"""
from typing import Sequence, Union

from alembic import op


revision: str = "h013"
down_revision: Union[str, None] = "dc01_finance_departures"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Named by Postgres' default when `sa.Column(unique=True)` created it.
    op.drop_constraint("health_food_items_name_key", "health_food_items", type_="unique")
    op.create_unique_constraint(
        "uq_food_user_name", "health_food_items", ["user_id", "name"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_food_user_name", "health_food_items", type_="unique")
    op.create_unique_constraint(
        "health_food_items_name_key", "health_food_items", ["name"]
    )
