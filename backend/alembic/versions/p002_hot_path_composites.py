"""Indexes for the health hot paths and the finance account foreign keys.

Postgres does not auto-index foreign keys. `p001` gave the finance transaction
tables their `(user_id, …)` composites; health never got the same pass, and
the account FKs outside those three tables were never indexed at all — which
also makes the `ON DELETE SET NULL` sweep added in `f002` a sequential scan of
every child table per account delete.

- `health_logs` is the highest-volume table in the app and carried `(user_id)`
  alone, while every read of it is a time range.
- `health_workout_sets.session_id` had no index, so rendering a session list
  was one sequential scan per session.
- `health_habit_checks.habit_id` had no index either, yet the streak query
  filters on it. `h016`'s unique constraint indexes `(user_id, habit_id,
  check_date)`, which a habit_id-only predicate cannot use as a prefix.

Revision ID: p002_hot_path_composites
Revises: a002_audit_admin_id_setnull
Create Date: 2026-08-16
"""
from typing import Sequence, Union

from alembic import op


revision: str = "p002_hot_path_composites"
down_revision: Union[str, None] = "a002_audit_admin_id_setnull"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_INDEXES = [
    ("ix_health_logs_user_logged", "health_logs", ["user_id", "logged_at"]),
    ("ix_health_workout_sets_session", "health_workout_sets", ["session_id"]),
    ("ix_health_habit_checks_habit", "health_habit_checks", ["habit_id"]),
    ("ix_finance_transfers_from_account", "finance_transfers", ["from_account_id"]),
    ("ix_finance_transfers_to_account", "finance_transfers", ["to_account_id"]),
    ("ix_finance_bills_account", "finance_bills", ["account_id"]),
    ("ix_finance_loans_account", "finance_loans", ["account_id"]),
]


def upgrade() -> None:
    for name, table, columns in _INDEXES:
        op.create_index(name, table, columns, unique=False)


def downgrade() -> None:
    for name, table, _ in reversed(_INDEXES):
        op.drop_index(name, table_name=table)
