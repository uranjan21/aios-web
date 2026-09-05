"""DB-level enum CHECK constraints (S11).

The point of these constraints is the writers that never see a Pydantic model —
the Gmail ingestion runner, the vault extractor, the agent runners, the chat
tools. So the tests here go through the ORM directly, not the API.
"""
import ast
import pathlib

import pytest
import sqlalchemy as sa
from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel

MIGRATION = (
    pathlib.Path(__file__).resolve().parents[1]
    / "alembic"
    / "versions"
    / "m002_enum_checks.py"
)


def _migration_checks():
    """Read the migration's CHECKS table without importing it.

    `backend/alembic/` is a package in this tree, so it shadows the installed
    `alembic` distribution and `from alembic import op` fails on import here.
    The list is a plain literal, so parse it.
    """
    tree = ast.parse(MIGRATION.read_text())
    for node in tree.body:
        targets = getattr(node, "targets", []) or [getattr(node, "target", None)]
        for target in targets:
            if isinstance(target, ast.Name) and target.id == "CHECKS":
                return ast.literal_eval(node.value)
    raise AssertionError("CHECKS not found in m002_enum_checks.py")


def test_orm_metadata_mirrors_every_constraint_in_the_migration():
    """A migration-only constraint means the SQLite test DB doesn't have it, so
    nothing under test exercises production's actual rules."""
    import app.models  # noqa: F401

    tables = SQLModel.metadata.tables

    for table_name, column, values, _fallback, _why in _migration_checks():
        table = tables[table_name]
        name = f"ck_{table_name}_{column}"
        constraint = next(
            (c for c in table.constraints if c.name == name),
            None,
        )
        assert constraint is not None, f"{name} is in the migration but not the model"
        sql = str(constraint.sqltext)
        for value in values:
            assert f"'{value}'" in sql, f"{name} is missing {value!r}"


@pytest.mark.asyncio
async def test_task_status_and_priority_are_rejected_at_the_db(
    user_a, db_session_factory
):
    from app.models.workspace import Task

    async with db_session_factory() as s:
        s.add(Task(user_id=user_a.id, title="ok", status="todo", priority="urgent"))
        await s.commit()

    for bad in ({"status": "blocked"}, {"priority": "critical"}):
        async with db_session_factory() as s:
            s.add(Task(user_id=user_a.id, title="bad", **bad))
            with pytest.raises(IntegrityError):
                await s.commit()


@pytest.mark.asyncio
async def test_account_type_is_rejected_at_the_db(user_a, db_session_factory):
    """finance_accounts.type is guarded by its TYPE, not a CHECK constraint.

    It is a native PostgreSQL ENUM (`accounttype`), so the column already
    refuses anything outside the member set — a CHECK would be redundant. It
    also stores member NAMES in upper case ('CHECKING'), so a CHECK written
    against the lower-case values would have rejected every existing row and
    the accompanying normalisation step would have rewritten all of them to a
    single fallback type. That is why this column is deliberately absent from
    m002_enum_checks.
    """
    from app.models.finance import Account, AccountType

    # The enum is the guard: a non-member cannot even be constructed.
    with pytest.raises(ValueError):
        AccountType("wallet")

    # And a real member round-trips.
    async with db_session_factory() as s:
        s.add(Account(user_id=user_a.id, name="ok", type=AccountType.CHECKING))
        await s.commit()


@pytest.mark.asyncio
async def test_pending_transaction_states_are_rejected_at_the_db(
    user_a, db_session_factory
):
    """This is the ingestion path — the one that bypasses every Pydantic model."""
    import datetime as dt

    from app.models.finance import FinancePendingTransaction

    def _row(**kw):
        return FinancePendingTransaction(
            user_id=user_a.id,
            amount=100,
            logged_at=dt.datetime.utcnow(),
            raw_email_snippet="…",
            **kw,
        )

    async with db_session_factory() as s:
        s.add(_row(status="approved", transaction_type="income"))
        await s.commit()

    for bad in ({"status": "queued"}, {"transaction_type": "refund"}):
        async with db_session_factory() as s:
            s.add(_row(**bad))
            with pytest.raises(IntegrityError):
                await s.commit()


@pytest.mark.asyncio
async def test_milestone_and_goal_statuses_are_rejected_at_the_db(
    user_a, db_session_factory
):
    from app.models.goal import MacroGoal
    from app.models.workspace import Milestone

    async with db_session_factory() as s:
        s.add(MacroGoal(user_id=user_a.id, title="bad", status="paused"))
        with pytest.raises(IntegrityError):
            await s.commit()

    async with db_session_factory() as s:
        s.add(Milestone(user_id=user_a.id, title="bad", status="done"))
        with pytest.raises(IntegrityError):
            await s.commit()


def test_forecast_predicted_value_is_numeric_not_float():
    """It holds `end_of_month_balance` — money never belongs in a binary float."""
    from app.models.forecast import Forecast

    column = Forecast.__table__.c.predicted_value
    assert isinstance(column.type, sa.Numeric)
    assert not isinstance(column.type, sa.Float)
    assert (column.type.precision, column.type.scale) == (14, 2)
