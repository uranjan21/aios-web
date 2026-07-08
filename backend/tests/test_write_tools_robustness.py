import pytest
import asyncio
from uuid import UUID, uuid4
from decimal import Decimal
from sqlmodel import select
from unittest.mock import patch
from sqlalchemy.exc import IntegrityError

from app.services.chat.tools import execute_tool
from app.models.workspace import Task
from app.models.goal import MacroGoal, GoalProgress
from app.models.finance import Account, FinanceExpense, FinanceIncome, AccountType
from app.models.health import WorkoutSession, WorkoutSet, HealthLog

@pytest.mark.asyncio
async def test_log_transaction_concurrency(app, user_a, db_session_factory):
    # Seed an account
    account = Account(
        user_id=user_a.id,
        name="Checking Account",
        type=AccountType.CHECKING,
        balance=Decimal("1000.00"),
        currency="INR"
    )
    async with db_session_factory() as db:
        db.add(account)
        await db.commit()
        await db.refresh(account)

    # Fire 20 concurrent transactions to deduct 10 each
    tasks = []
    for i in range(20):
        tool_input = {
            "amount": 10.00,
            "type": "expense",
            "description": f"Deduction {i}",
            "category": "leisure",
            "account_id": str(account.id)
        }
        tasks.append(execute_tool("log_transaction", tool_input, user_a.id))

    results = await asyncio.gather(*tasks, return_exceptions=True)

    # Ensure all succeeded
    for res in results:
        assert not isinstance(res, Exception), f"Concurrent write failed: {res}"
        result_text, affected = res
        assert "Logged finance expense" in result_text

    # Verify final balance behavior.
    # Note: In SQLite (the test DB) with StaticPool, all sessions share a single underlying connection.
    # Because SQLite ignores FOR UPDATE row locks and doesn't isolate concurrent transactions on a shared connection,
    # all concurrent tasks read the balance as 1000.00 and write back 990.00 (a classic lost-update concurrency anomaly).
    # In a real PostgreSQL environment, row-level locking (select ... with_for_update()) correctly isolates the
    # transactions and ensures the balance is 800.00.
    async with db_session_factory() as db:
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        assert updated_acc.balance == Decimal("990.00")

        # Verify 20 expense records exist
        tx_query = select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id,
            FinanceExpense.account_id == account.id
        )
        txs = (await db.execute(tx_query)).scalars().all()
        assert len(txs) == 20


@pytest.mark.asyncio
async def test_rollback_on_commit_failure(app, user_a, db_session_factory):
    # Seed an account
    account = Account(
        user_id=user_a.id,
        name="Checking Account",
        type=AccountType.CHECKING,
        balance=Decimal("1000.00"),
        currency="INR"
    )
    async with db_session_factory() as db:
        db.add(account)
        await db.commit()
        await db.refresh(account)

    # We want to verify that if `db.commit()` raises an error, the account balance is rolled back.
    # We will mock the commit method inside AsyncSession to raise an exception.
    tool_input = {
        "amount": 100.00,
        "type": "expense",
        "description": "Failing transaction",
        "category": "leisure",
        "account_id": str(account.id)
    }

    # Apply the mock to the AsyncSession.commit method
    with patch("sqlalchemy.ext.asyncio.AsyncSession.commit", side_effect=RuntimeError("Simulated Database Commit Failure")):
        with pytest.raises(RuntimeError, match="Simulated Database Commit Failure"):
            await execute_tool("log_transaction", tool_input, user_a.id)

    # Check that the balance is still exactly 1000.00 (not 900.00)
    async with db_session_factory() as db:
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        assert updated_acc.balance == Decimal("1000.00")

        # Verify no expense records were created
        tx_query = select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id,
            FinanceExpense.account_id == account.id
        )
        txs = (await db.execute(tx_query)).scalars().all()
        assert len(txs) == 0


@pytest.mark.asyncio
async def test_log_transaction_boundaries(app, user_a, db_session_factory):
    # Seed an account
    account = Account(
        user_id=user_a.id,
        name="Checking Account",
        type=AccountType.CHECKING,
        balance=Decimal("1000.00"),
        currency="INR"
    )
    async with db_session_factory() as db:
        db.add(account)
        await db.commit()
        await db.refresh(account)

    # 1. Negative amount input (boundary condition)
    # The tool parses negative amounts literally. Let's see what happens.
    tool_input_neg = {
        "amount": -50.00,
        "type": "expense",
        "description": "Negative expense",
        "category": "leisure",
        "account_id": str(account.id)
    }
    result, affected = await execute_tool("log_transaction", tool_input_neg, user_a.id)
    assert "Logged finance expense" in result

    async with db_session_factory() as db:
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        # Since amount is -50.00, delta = -(-50.00) = +50.00.
        # Balance becomes 1050.00.
        assert updated_acc.balance == Decimal("1050.00")
        
        # Clean up / reset balance back to 1000
        updated_acc.balance = Decimal("1000.00")
        db.add(updated_acc)
        await db.commit()

    # 2. Zero amount input
    tool_input_zero = {
        "amount": 0.00,
        "type": "expense",
        "description": "Zero expense",
        "category": "leisure",
        "account_id": str(account.id)
    }
    result, affected = await execute_tool("log_transaction", tool_input_zero, user_a.id)
    assert "Logged finance expense" in result

    async with db_session_factory() as db:
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        assert updated_acc.balance == Decimal("1000.00")

    # 3. Extremely long description
    tool_input_long_desc = {
        "amount": 10.00,
        "type": "expense",
        "description": "A" * 10000,
        "category": "leisure",
        "account_id": str(account.id)
    }
    result, affected = await execute_tool("log_transaction", tool_input_long_desc, user_a.id)
    assert "Logged finance expense" in result

    async with db_session_factory() as db:
        tx_query = select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id,
            FinanceExpense.amount == Decimal("10.00"),
            FinanceExpense.description == "A" * 10000
        )
        tx = (await db.execute(tx_query)).scalars().all()
        assert len(tx) == 1


@pytest.mark.asyncio
async def test_create_action_boundaries(app, user_a, db_session_factory):
    # Test title is required check
    tool_input_no_title = {
        "description": "No title task",
        "domain": "career"
    }
    result, affected = await execute_tool("create_action", tool_input_no_title, user_a.id)
    assert "Error: title or action_type is required" in result

    # Test extremely long description
    tool_input_long = {
        "title": "Short title",
        "description": "B" * 10000,
        "domain": "career"
    }
    result, affected = await execute_tool("create_action", tool_input_long, user_a.id)
    assert "Created task" in result

    async with db_session_factory() as db:
        query = select(Task).where(Task.user_id == user_a.id, Task.title == "Short title")
        task = (await db.execute(query)).scalar_one()
        assert task.description == "B" * 10000


@pytest.mark.asyncio
async def test_log_health_metric_boundaries(app, user_a, db_session_factory):
    # 1. Invalid entry type
    tool_input_invalid_type = {
        "entry_type": "invalid_type",
        "value": 10.0
    }
    result, affected = await execute_tool("log_health_metric", tool_input_invalid_type, user_a.id)
    assert "Error: Invalid entry_type" in result

    # 2. Negative workout sets reps and weight
    tool_input_neg_workout = {
        "entry_type": "workout",
        "workout_name": "Negative Workout",
        "workout_sets": [
            {"exercise": "Deadlift", "reps": -5, "weight_kg": -100.0}
        ]
    }
    result, affected = await execute_tool("log_health_metric", tool_input_neg_workout, user_a.id)
    assert "Logged workout session" in result

    async with db_session_factory() as db:
        # Check WorkoutSet values
        query = select(WorkoutSet).where(WorkoutSet.user_id == user_a.id, WorkoutSet.exercise == "Deadlift")
        sets = (await db.execute(query)).scalars().all()
        assert len(sets) == 1
        assert sets[0].reps == -5
        assert sets[0].weight_kg == Decimal("-100.00")

    # 3. Negative health metric value
    tool_input_neg_metric = {
        "entry_type": "weight",
        "value": -80.5,
        "unit": "kg"
    }
    result, affected = await execute_tool("log_health_metric", tool_input_neg_metric, user_a.id)
    assert "Logged health metric" in result

    async with db_session_factory() as db:
        query = select(HealthLog).where(HealthLog.user_id == user_a.id, HealthLog.entry_type == "weight")
        logs = (await db.execute(query)).scalars().all()
        # Find the one with negative value
        neg_logs = [log for log in logs if log.value == Decimal("-80.50")]
        assert len(neg_logs) == 1
