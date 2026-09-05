"""Normalise the seven tz-aware tables to naive UTC, the convention everywhere else.

S12 of the 2026-08-16 audit. Migrations `6e3b68412e0d` and `71fb288f8d09`
converted essentially the whole original schema from TIMESTAMPTZ to naive
TIMESTAMP. Seven tables added afterwards did not follow: `projects`, `sprints`,
`tasks`, `workspace_milestones`, `plan_blocks` (models/workspace.py),
`career_journal_entries` (models/career.py) and `saved_quotes`
(models/quote.py) — 13 columns in total. So one application compared naive UTC
values against aware ones across domains.

**Ground truth, measured before this was written, not assumed:**

* The database's `TimeZone` is `Etc/UTC`, from the configuration file (the
  postgres image default) — not a session override.
* Every writer to the five workspace tables and to `saved_quotes` already
  passes a NAIVE `datetime.utcnow()`; asyncpg encodes a naive value for a
  TIMESTAMPTZ column as UTC. `career_journal_entries` was the one genuine
  aware writer (`datetime.now(timezone.utc)`).
* A single seeding run wrote `finance_expenses.created_at` (naive) at
  `2026-08-10 16:33:20.34` and `projects.created_at` (aware) at
  `2026-08-10 16:33:20.76+00` — the same wall clock. The two representations
  agree, so the stored instants are genuinely UTC on both sides and nothing
  here is a mislabelled local time.

That makes naive-UTC the coherent target and makes the conversion lossless:
TIMESTAMPTZ stores an instant, not an offset, so `AT TIME ZONE 'UTC'` yields
exactly the UTC wall clock already being written. The `USING` clause is
spelled out on every statement so the intent is in the SQL rather than in the
session's `TimeZone` setting — an implicit `ALTER … TYPE timestamp` silently
uses `current_setting('TimeZone')`, which is precisely the mistake that makes
the ORIGINAL conversions unverifiable.

**Deliberately NOT touched: the columns those two original migrations already
converted.** They ran without a `USING` clause, so if any of them ever
executed under a non-UTC session TimeZone their values are shifted — and
nothing in the row records which. This migration cannot repair that without
guessing, and guessing is how you turn a suspicion into corruption. See the
S12 section at the end of `backend/CLAUDE.md` for the evidence that they are
in fact fine on this deployment and for what a real repair would require.

`saved_quotes.saved_at` carries a `now()` server default. `now()` is
TIMESTAMPTZ, so leaving it in place across the type change would leave an
implicit, TimeZone-dependent cast on the column. It is dropped and re-set as
`timezone('utc', now())`, which is the same value under a UTC session and the
correct one under any other.

Revision ID: n002_timestamp_normalisation
Revises: n001_soft_delete
Create Date: 2026-08-23
"""
from alembic import op


revision = "n002_timestamp_normalisation"
down_revision = "n001_soft_delete"
branch_labels = None
depends_on = None


# (table, columns) — every TIMESTAMPTZ column in the schema outside pg_catalog.
AWARE_COLUMNS: list[tuple[str, tuple[str, ...]]] = [
    ("projects", ("created_at", "updated_at")),
    ("sprints", ("created_at", "updated_at")),
    ("tasks", ("created_at", "updated_at")),
    ("workspace_milestones", ("created_at", "updated_at")),
    ("plan_blocks", ("created_at", "updated_at")),
    ("career_journal_entries", ("created_at", "updated_at")),
    ("saved_quotes", ("saved_at",)),
]


def upgrade() -> None:
    # The one server default in the set, dropped so the type change cannot
    # carry an implicit now()::timestamp cast forward.
    op.execute("ALTER TABLE saved_quotes ALTER COLUMN saved_at DROP DEFAULT")

    for table, columns in AWARE_COLUMNS:
        for column in columns:
            op.execute(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {column} TYPE TIMESTAMP WITHOUT TIME ZONE "
                f"USING {column} AT TIME ZONE 'UTC'"
            )

    op.execute(
        "ALTER TABLE saved_quotes "
        "ALTER COLUMN saved_at SET DEFAULT timezone('utc', now())"
    )


def downgrade() -> None:
    """Restore TIMESTAMPTZ, reading the naive values back as UTC.

    The inverse of the `USING` above: `col AT TIME ZONE 'UTC'` on a naive
    value means "this wall clock IS UTC" and produces the same instant, so a
    round trip is byte-for-byte identical regardless of session TimeZone.
    """
    op.execute("ALTER TABLE saved_quotes ALTER COLUMN saved_at DROP DEFAULT")

    for table, columns in AWARE_COLUMNS:
        for column in columns:
            op.execute(
                f"ALTER TABLE {table} "
                f"ALTER COLUMN {column} TYPE TIMESTAMP WITH TIME ZONE "
                f"USING {column} AT TIME ZONE 'UTC'"
            )

    op.execute("ALTER TABLE saved_quotes ALTER COLUMN saved_at SET DEFAULT now()")
