"""Health: restore uniqueness on health_habit_checks, per user.

`71fb288f8d09` dropped `uq_habit_check_day` while adding `user_id`, and only
its *downgrade* ever recreated it — no later migration put it back, and
`HabitCheck` declares no `__table_args__`, so the table has been accepting
duplicate rows ever since. `api/areas/health.py` reads today's check with
`scalar_one_or_none()`, so the second row from a double-tapped toggle turns
into a permanent 500 on that habit until someone cleans it up by hand, and
every streak built by counting rows over-counts.

The restored constraint is `(user_id, habit_id, check_date)`, NOT the old
global `(habit_id, check_date)`: habits are per-user data now, and the pair
alone would let one tenant's row block another's insert — the exact class of
bug `h008` swept out of six other tables.

Existing duplicates are collapsed first (earliest `created_at` per group wins,
`id` breaking ties so the choice is deterministic); a check is a boolean fact
about a day, so the surviving row carries no information the deleted ones add.

Revision ID: h016_habit_check_unique
Revises: f002_account_fk_ondelete
Create Date: 2026-08-16
"""
from typing import Sequence, Union

from alembic import op


revision: str = "h016_habit_check_unique"
down_revision: Union[str, None] = "f002_account_fk_ondelete"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DELETE FROM health_habit_checks a
        USING health_habit_checks b
        WHERE a.user_id = b.user_id
          AND a.habit_id = b.habit_id
          AND a.check_date = b.check_date
          AND (a.created_at, a.id) > (b.created_at, b.id)
        """
    )
    op.create_unique_constraint(
        "uq_habit_check_user_day",
        "health_habit_checks",
        ["user_id", "habit_id", "check_date"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_habit_check_user_day", "health_habit_checks", type_="unique")
