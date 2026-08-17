"""Admin audit: let the acting admin's account be deleted.

`admin_audit_logs.admin_id` is a NOT NULL FK to `users.id` with no delete
behaviour. Both erasure paths (`admin_delete_user` and the self-serve
`DELETE /auth/me`) sweep only tables carrying a literal `user_id` column, and
this table's column is named `admin_id`, so the rows are never removed — the
subsequent `db.delete(user)` hits the constraint and rolls the entire
transaction back. That is the GDPR right-to-erasure path, failing for exactly
the accounts most likely to be deleted on purpose.

`admin_id` becomes nullable with `ON DELETE SET NULL` rather than CASCADE: an
audit trail that deletes itself when the actor leaves is not an audit trail.
The row survives with `admin_id = NULL`, and the actor's identity is meant to
be carried in the already-existing `details` JSON — see the handoff note in
the session report; `api/admin.py` does not write `admin_email` there yet, so
rows created before that lands lose the actor's identity on erasure.

Revision ID: a002_audit_admin_id_setnull
Revises: h016_habit_check_unique
Create Date: 2026-08-16
"""
from typing import Optional, Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = "a002_audit_admin_id_setnull"
down_revision: Union[str, None] = "h016_habit_check_unique"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_fk_name() -> Optional[str]:
    inspector = sa.inspect(op.get_bind())
    for fk in inspector.get_foreign_keys("admin_audit_logs"):
        if fk.get("referred_table") == "users" and fk.get("constrained_columns") == ["admin_id"]:
            return fk.get("name")
    return None


def upgrade() -> None:
    op.alter_column(
        "admin_audit_logs", "admin_id", existing_type=sa.Uuid(), nullable=True
    )
    old = _existing_fk_name()
    if old:
        op.drop_constraint(old, "admin_audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "fk_admin_audit_logs_admin_id",
        "admin_audit_logs",
        "users",
        ["admin_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Rows orphaned while the constraint was SET NULL cannot be re-pointed at a
    # user, so they are dropped — the column is going back to NOT NULL.
    op.execute("DELETE FROM admin_audit_logs WHERE admin_id IS NULL")
    op.drop_constraint(
        "fk_admin_audit_logs_admin_id", "admin_audit_logs", type_="foreignkey"
    )
    op.create_foreign_key(
        "fk_admin_audit_logs_admin_id", "admin_audit_logs", "users", ["admin_id"], ["id"]
    )
    op.alter_column(
        "admin_audit_logs", "admin_id", existing_type=sa.Uuid(), nullable=False
    )
