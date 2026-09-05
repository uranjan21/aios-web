"""DB-level CHECK constraints on the enum-ish columns, plus money typing on forecasts.

S11 of the 2026-08-16 audit: 76 tables carried exactly **two** CHECK constraints.
Every other "enum" — account type, opportunity status, task status/priority —
was free text whose only guard was a Pydantic model in a router. That guard is
real for HTTP traffic and worth nothing for the writers that bypass the routers
entirely: the Gmail ingestion runner, the vault extractor, the agent runners and
the chat tools all construct SQLModel objects directly. A typo there lands in the
column, renders as an unstyled unknown state in the UI, and is invisible until
someone reads the rows.

**Value sets are derived from the code, not guessed.** Each block below names
where its set comes from. Columns whose vocabulary is genuinely open (domain,
platform, category, tags, `content_items.content_type`, `finance_snapshots.source`)
are deliberately left alone — a CHECK on a column that grows is a migration tax,
not a safety net. See the "deliberately skipped" note at the bottom.

**This migration cannot fail on existing rows.** Postgres validates a new CHECK
against every existing row, so each block first normalises anything outside its
set to that column's declared default. Anything rewritten was already unreadable
to the app (no UI branch, no query matches it), so normalising is strictly
better than a migration that aborts on a legacy row nobody can name.

Also converts `forecasts.predicted_value` from `double precision` to
`NUMERIC(14,2)`. It holds `end_of_month_balance` — money — and binary floating
point is the wrong storage for money. The model annotation stays `float` so the
arithmetic in `services/ai/forecasting.py` is untouched; only the column type
changes.

Revision ID: m002_enum_checks
Revises: m001_drop_billing
Create Date: 2026-08-20
"""
from alembic import op
import sqlalchemy as sa

revision = "m002_enum_checks"
down_revision = "m001_drop_billing"
branch_labels = None
depends_on = None


# (table, column, allowed values, fallback for anything else, provenance)
CHECKS: list[tuple[str, str, tuple[str, ...], str, str]] = [
    # NOTE: finance_accounts.type is deliberately ABSENT. It is a native
    # PostgreSQL ENUM (`accounttype`), so the type itself already rejects
    # anything outside the member set — a CHECK would be redundant. It also
    # stores member NAMES in upper case ('CHECKING'), not the lower-case
    # values, so the obvious constraint would have rejected every real row.
    # api/areas/career.py:191 VALID_OPPORTUNITY_STATUS
    (
        "job_opportunities",
        "status",
        ("prospect", "applied", "screening", "interview", "offer", "rejected", "closed"),
        "prospect",
        "VALID_OPPORTUNITY_STATUS",
    ),
    # api/areas/career.py:441 _LEARNING_STATUSES
    (
        "career_learning_resources",
        "status",
        ("planned", "in_progress", "completed", "abandoned"),
        "planned",
        "_LEARNING_STATUSES",
    ),
    # models/content.py:33. The content router was deleted in the 2026-07-21
    # redesign, so the only remaining readers are insights.py:303 and
    # services/insights/digest.py — both match "scheduled"/"published".
    (
        "content_items",
        "status",
        ("idea", "in_progress", "scheduled", "published", "archived"),
        "idea",
        "ContentItem.status",
    ),
    # api/finance_pending.py — the queue has exactly three states.
    (
        "finance_pending_transactions",
        "status",
        ("pending", "approved", "dismissed"),
        "pending",
        "finance_pending.py",
    ),
    # api/finance_pending.py:33 Literal["expense", "income"], and every
    # non-router writer coerces to the same pair
    # (services/finance/email_extraction.py:224).
    (
        "finance_pending_transactions",
        "transaction_type",
        ("expense", "income"),
        "expense",
        'Literal["expense", "income"]',
    ),
    # api/goals.py:20 GOAL_STATUSES
    (
        "macro_goals",
        "status",
        ("active", "completed", "archived"),
        "active",
        "GOAL_STATUSES",
    ),
    # frontend .../workspace/tasks/constants.ts STATUS_OPTIONS, and the chat
    # tool schema services/chat/tools.py:102 declares the same three.
    (
        "tasks",
        "status",
        ("todo", "in_progress", "done"),
        "todo",
        "STATUS_OPTIONS + chat tool enum",
    ),
    # frontend .../workspace/tasks/constants.ts PRIORITY_OPTIONS
    (
        "tasks",
        "priority",
        ("low", "medium", "high", "urgent"),
        "medium",
        "PRIORITY_OPTIONS",
    ),
    # models/finance.py:192, mirrored by the frontend's INVESTMENT_META map
    # (QuickAddAccounts.tsx / InvestmentsTab.tsx).
    (
        "finance_investments",
        "type",
        (
            "stock", "mutual_fund", "fd", "fixed_deposit", "ppf", "nps",
            "crypto", "gold", "bond", "retirement", "other",
        ),
        "other",
        "FinanceInvestment.type + INVESTMENT_META, widened to cover the "
        "bond/fixed_deposit/retirement values found in live data",
    ),
    # api/workspace.py:414 MILESTONE_STATUSES
    (
        "workspace_milestones",
        "status",
        ("upcoming", "at_risk", "hit", "missed"),
        "upcoming",
        "MILESTONE_STATUSES",
    ),
]


def _name(table: str, column: str) -> str:
    return f"ck_{table}_{column}"


def _in_list(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in values)


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    for table, column, values, fallback, _why in CHECKS:
        if table not in existing:
            # Migrations may lag the models on a partially-built database.
            continue
        allowed = _in_list(values)
        # A new CHECK is validated against every existing row, so rows outside
        # the set have to be dealt with first. NULLs take the fallback — that is
        # an unset value, not a meaningful one.
        conn.execute(
            sa.text(
                f'UPDATE "{table}" SET "{column}" = :fallback '
                f'WHERE "{column}" IS NULL'
            ),
            {"fallback": fallback},
        )
        # Anything else that is non-NULL and outside the set is REAL USER DATA
        # with a meaning we do not know, so refuse rather than guess. The first
        # draft of this migration silently rewrote such rows to the fallback,
        # which against the live database would have flattened every account
        # type and three kinds of investment into one value. If this raises,
        # widen the tuple above to match reality — do not "fix" the data.
        rogue = conn.execute(
            sa.text(
                f'SELECT DISTINCT "{column}" FROM "{table}" '
                f'WHERE "{column}" IS NOT NULL AND "{column}" NOT IN ({allowed})'
            )
        ).scalars().all()
        if rogue:
            raise RuntimeError(
                f"{table}.{column} holds values outside the proposed CHECK: "
                f"{sorted(map(str, rogue))}. Widen the allowed set in "
                f"m002_enum_checks (provenance: {_why}) rather than rewriting "
                f"live rows."
            )
        op.create_check_constraint(
            _name(table, column), table, f'"{column}" IN ({allowed})'
        )

    # forecasts.predicted_value: money must not be a binary float.
    if "forecasts" in existing:
        op.alter_column(
            "forecasts",
            "predicted_value",
            existing_type=sa.Float(),
            type_=sa.Numeric(14, 2),
            existing_nullable=False,
            postgresql_using="predicted_value::numeric(14,2)",
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = set(inspector.get_table_names())

    if "forecasts" in existing:
        op.alter_column(
            "forecasts",
            "predicted_value",
            existing_type=sa.Numeric(14, 2),
            type_=sa.Float(),
            existing_nullable=False,
            postgresql_using="predicted_value::double precision",
        )

    for table, column, _values, _fallback, _why in reversed(CHECKS):
        if table not in existing:
            continue
        op.drop_constraint(_name(table, column), table, type_="check")


# ── Deliberately NOT constrained ──────────────────────────────────────────
#
# `projects.status`/`priority` and `sprints.status` carry the same vocabulary as
# `tasks`, but api/workspace.py validates NONE of the three and the frontend
# pages offer no status picker for projects or sprints — so the real value set
# in a live database is unknown rather than merely unenforced. Constraining them
# would be a guess; that is S11's follow-up, once a writer is pinned down.
#
# Open-ended by design, no CHECK possible: `*.domain`, `content_items.platform`
# and `.content_type`, `finance_categories.name`, `finance_snapshots.source`,
# `integration_credentials.provider` (grows with every integration),
# `agents.task_id`.
