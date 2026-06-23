"""Modular subscription: add modules/bundle/free_area + backfill from plan/addons

Phase 1 of the dynamic/modular pricing pivot. `modules` becomes the source of
truth for entitlement; `plan`/`addons` are kept (deprecated) for the Stripe
transition + admin compatibility. `ai_usage_records` is intentionally deferred
to Phase 2 (metered AI) — nothing writes it yet.

Revision ID: h010
Revises: b88ba8bcced2
Create Date: 2026-06-23
"""
import json
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h010"
down_revision: Union[str, None] = "b88ba8bcced2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_AREAS_FREE = ["finance", "health", "career"]
_PRO = _AREAS_FREE + ["chat", "agents", "integrations"]
_ALL = _PRO + ["business", "content"]


def _modules_for(plan: str, status: str, addons) -> tuple[list[str], bool]:
    if isinstance(addons, str):
        try:
            addons = json.loads(addons)
        except Exception:
            addons = []
    addons = addons or []
    if status not in ("active", "trialing") or plan == "free":
        return list(_AREAS_FREE), False
    if plan == "household":
        return list(_ALL), True
    # pro / pro_plus: core areas + services, plus any purchased add-ons
    mods = list(dict.fromkeys(_PRO + [a for a in addons if a in _ALL]))
    return mods, False


def upgrade() -> None:
    op.add_column("subscriptions", sa.Column("modules", sa.JSON(), nullable=True))
    op.add_column(
        "subscriptions",
        sa.Column("bundle", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("subscriptions", sa.Column("free_area", sa.String(), nullable=True))

    # Backfill the modular fields from the legacy plan + addons.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text("SELECT id, plan, status, addons FROM subscriptions")
    ).fetchall()
    for row in rows:
        m = row._mapping
        modules, bundle = _modules_for(m["plan"], m["status"], m["addons"])
        conn.execute(
            sa.text(
                "UPDATE subscriptions SET modules = CAST(:m AS JSON), bundle = :b WHERE id = :id"
            ),
            {"m": json.dumps(modules), "b": bundle, "id": m["id"]},
        )

    # Drop the temporary server default now that existing rows are populated.
    op.alter_column("subscriptions", "bundle", server_default=None)


def downgrade() -> None:
    op.drop_column("subscriptions", "free_area")
    op.drop_column("subscriptions", "bundle")
    op.drop_column("subscriptions", "modules")
