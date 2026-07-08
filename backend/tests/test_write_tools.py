import pytest
from uuid import UUID, uuid4
from decimal import Decimal
from sqlmodel import select

from app.services.chat.tools import execute_tool
from app.models.workspace import Task
from app.models.goal import MacroGoal, GoalProgress
from app.models.finance import Account, FinanceExpense, FinanceIncome, AccountType
from app.models.health import WorkoutSession, WorkoutSet, HealthLog

@pytest.mark.asyncio
async def test_create_action_tool(app, user_a, db_session_factory):
    # Test create_action tool with standard parameters
    tool_input = {
        "title": "Build write capabilities for AI OS",
        "description": "Add database write tools to TOOL_DEFINITIONS and execute_tool",
        "domain": "career",
        "status": "in_progress",
        "priority": "high",
        "due_date": "2026-07-09",
        "labels": "backend,ai"
    }

    result, affected = await execute_tool("create_action", tool_input, user_a.id)
    assert "Created task" in result

    async with db_session_factory() as db:
        query = select(Task).where(Task.user_id == user_a.id, Task.title == tool_input["title"])
        tasks = (await db.execute(query)).scalars().all()
        assert len(tasks) == 1
        task = tasks[0]
        assert task.description == tool_input["description"]
        assert task.domain == tool_input["domain"]
        assert task.status == tool_input["status"]
        assert task.priority == tool_input["priority"]
        assert str(task.due_date) == tool_input["due_date"]
        assert task.labels == tool_input["labels"]

@pytest.mark.asyncio
async def test_create_action_tool_fallback(app, user_a, db_session_factory):
    # Test legacy parameters fallback
    tool_input = {
        "action_type": "Legacy Task",
        "ai_explanation": "Legacy Description",
        "source_domain": "health"
    }

    result, affected = await execute_tool("create_action", tool_input, user_a.id)
    assert "Created task" in result

    async with db_session_factory() as db:
        query = select(Task).where(Task.user_id == user_a.id, Task.title == "Legacy Task")
        tasks = (await db.execute(query)).scalars().all()
        assert len(tasks) == 1
        task = tasks[0]
        assert task.description == "Legacy Description"
        assert task.domain == "health"

@pytest.mark.asyncio
async def test_update_goal_tool(app, user_a, db_session_factory):
    # Seed a MacroGoal first
    goal = MacroGoal(
        user_id=user_a.id,
        title="Lose 5kg",
        description="Health goal for Q3",
        category="health",
        status="active"
    )
    async with db_session_factory() as db:
        db.add(goal)
        await db.commit()
        await db.refresh(goal)

    # 1. Update progress and log entry
    tool_input = {
        "goal_id": str(goal.id),
        "progress_score": 40,
        "ai_insight": "Good progress on cardio"
    }
    result, affected = await execute_tool("update_goal", tool_input, user_a.id)
    assert "progress to 40%" in result

    async with db_session_factory() as db:
        # Check progress log
        progress_query = select(GoalProgress).where(
            GoalProgress.goal_id == goal.id,
            GoalProgress.user_id == user_a.id
        )
        logs = (await db.execute(progress_query)).scalars().all()
        assert len(logs) == 1
        assert logs[0].progress_score == 40
        assert logs[0].ai_insight == "Good progress on cardio"

    # 2. Update status to completed on progress 100
    tool_input = {
        "goal_id": str(goal.id),
        "progress_score": 100,
        "ai_insight": "Goal fully achieved!"
    }
    result, affected = await execute_tool("update_goal", tool_input, user_a.id)
    assert "progress to 100%" in result

    async with db_session_factory() as db:
        # Check macro goal is completed
        goal_query = select(MacroGoal).where(MacroGoal.id == goal.id)
        updated_goal = (await db.execute(goal_query)).scalar_one()
        assert updated_goal.status == "completed"

    # 3. Direct field updates (status, title, description)
    tool_input = {
        "goal_id": str(goal.id),
        "status": "archived",
        "title": "Maintain health",
        "description": "Updated goal desc"
    }
    result, affected = await execute_tool("update_goal", tool_input, user_a.id)
    assert "Updated goal" in result

    async with db_session_factory() as db:
        goal_query = select(MacroGoal).where(MacroGoal.id == goal.id)
        updated_goal = (await db.execute(goal_query)).scalar_one()
        assert updated_goal.status == "archived"
        assert updated_goal.title == "Maintain health"
        assert updated_goal.description == "Updated goal desc"

@pytest.mark.asyncio
async def test_log_transaction_tool(app, user_a, db_session_factory):
    # Seed an account
    account = Account(
        user_id=user_a.id,
        name="Main checking",
        type=AccountType.CHECKING,
        balance=Decimal("1500.00"),
        currency="INR"
    )
    async with db_session_factory() as db:
        db.add(account)
        await db.commit()
        await db.refresh(account)

    # 1. Log expense and adjust balance
    tool_input = {
        "amount": 200.50,
        "type": "expense",
        "description": "Grocery shopping at Supermarket",
        "category": "food",
        "account_id": str(account.id),
        "tags": "groceries,weekly"
    }
    result, affected = await execute_tool("log_transaction", tool_input, user_a.id)
    assert "Logged finance expense" in result

    async with db_session_factory() as db:
        # Verify expense transaction exists
        tx_query = select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id,
            FinanceExpense.amount == Decimal("200.50")
        )
        tx = (await db.execute(tx_query)).scalars().all()
        assert len(tx) == 1
        assert tx[0].description == tool_input["description"]
        assert tx[0].category == tool_input["category"]
        assert tx[0].account_id == account.id
        assert tx[0].tags == tool_input["tags"]

        # Verify balance was adjusted: 1500.00 - 200.50 = 1299.50
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        assert updated_acc.balance == Decimal("1299.50")

    # 2. Log income and adjust balance
    tool_input = {
        "amount": 500.00,
        "type": "income",
        "description": "Freelance payment",
        "category": "Salary",
        "account_id": str(account.id)
    }
    result, affected = await execute_tool("log_transaction", tool_input, user_a.id)
    assert "Logged finance income" in result

    async with db_session_factory() as db:
        # Verify income transaction exists
        tx_query = select(FinanceIncome).where(
            FinanceIncome.user_id == user_a.id,
            FinanceIncome.amount == Decimal("500.00")
        )
        tx = (await db.execute(tx_query)).scalars().all()
        assert len(tx) == 1
        assert tx[0].description == tool_input["description"]
        assert tx[0].source == tool_input["category"]
        assert tx[0].account_id == account.id

        # Verify balance was adjusted: 1299.50 + 500.00 = 1799.50
        acc_query = select(Account).where(Account.id == account.id)
        updated_acc = (await db.execute(acc_query)).scalar_one()
        assert updated_acc.balance == Decimal("1799.50")

@pytest.mark.asyncio
async def test_log_transaction_tool_auto_account(app, user_a, db_session_factory):
    # Test auto-creating account when no account exists
    tool_input = {
        "amount": 50.00,
        "type": "expense",
        "description": "Coffee shop",
        "category": "coffee"
    }

    result, affected = await execute_tool("log_transaction", tool_input, user_a.id)
    assert "Logged finance expense" in result

    async with db_session_factory() as db:
        # Verify a default account was created
        acc_query = select(Account).where(Account.user_id == user_a.id, Account.name == "Checking")
        accounts = (await db.execute(acc_query)).scalars().all()
        assert len(accounts) == 1
        # Balance should be: 0.00 - 50.00 = -50.00
        assert accounts[0].balance == Decimal("-50.00")

@pytest.mark.asyncio
async def test_log_health_metric_workout(app, user_a, db_session_factory):
    # Test logging a workout session and workout sets
    tool_input = {
        "entry_type": "workout",
        "workout_name": "Chest Day",
        "notes": "Focused on bench press",
        "workout_sets": [
            {"exercise": "Bench Press", "reps": 10, "weight_kg": 60},
            {"exercise": "Bench Press", "reps": 8, "weight_kg": 70},
            {"exercise": "Incline Dumbbell Press", "reps": 12, "weight_kg": 24}
        ]
    }

    result, affected = await execute_tool("log_health_metric", tool_input, user_a.id)
    assert "Logged workout session" in result
    assert "3 sets" in result

    async with db_session_factory() as db:
        # Verify WorkoutSession was created
        session_query = select(WorkoutSession).where(
            WorkoutSession.user_id == user_a.id,
            WorkoutSession.name == "Chest Day"
        )
        sessions = (await db.execute(session_query)).scalars().all()
        assert len(sessions) == 1
        session = sessions[0]
        assert session.notes == "Focused on bench press"

        # Verify WorkoutSets were created
        sets_query = select(WorkoutSet).where(
            WorkoutSet.user_id == user_a.id,
            WorkoutSet.session_id == session.id
        ).order_by(WorkoutSet.set_number)
        sets = (await db.execute(sets_query)).scalars().all()
        assert len(sets) == 3

        assert sets[0].exercise == "Bench Press"
        assert sets[0].reps == 10
        assert sets[0].weight_kg == Decimal("60.00")
        assert sets[0].set_number == 1

        assert sets[1].exercise == "Bench Press"
        assert sets[1].reps == 8
        assert sets[1].weight_kg == Decimal("70.00")
        assert sets[1].set_number == 2

        assert sets[2].exercise == "Incline Dumbbell Press"
        assert sets[2].reps == 12
        assert sets[2].weight_kg == Decimal("24.00")
        assert sets[2].set_number == 3

@pytest.mark.asyncio
async def test_log_health_metric_general(app, user_a, db_session_factory):
    # Test logging a general health metric (e.g. weight, sleep)
    tool_input_weight = {
        "entry_type": "weight",
        "value": 78.4,
        "unit": "kg",
        "notes": "Morning check-in"
    }

    result, affected = await execute_tool("log_health_metric", tool_input_weight, user_a.id)
    assert "Logged health metric: weight" in result

    async with db_session_factory() as db:
        log_query = select(HealthLog).where(
            HealthLog.user_id == user_a.id,
            HealthLog.entry_type == "weight"
        )
        logs = (await db.execute(log_query)).scalars().all()
        assert len(logs) == 1
        assert logs[0].value == Decimal("78.40")
        assert logs[0].unit == "kg"
        assert logs[0].notes == "Morning check-in"
        assert logs[0].source == "agent"
