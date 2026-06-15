import asyncio
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from sqlmodel import select
from app.db.session import engine

# Import all models
from app.models.finance import (
    FinanceSnapshot, FinanceExpense, BudgetLimit, Account,
    FinanceInvestment, FinanceLoan, FinanceBill, FinancialGoal, FinanceIncome, FinanceTransfer
)
from app.models.health import (
    HealthLog, HealthGoal, WorkoutSession, WorkoutSet, Habit, HabitCheck
)

async def seed_data():
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine) as session:
        # ---- FINANCE ----
        # 1. Accounts
        await session.execute(Account.__table__.delete())
        acc_bank = Account(id=uuid.uuid4(), name="Main Checking", type="checking", balance=Decimal('5200.00'), currency="USD")
        acc_savings = Account(id=uuid.uuid4(), name="High Yield Savings", type="savings", balance=Decimal('15000.00'), currency="USD")
        acc_cc = Account(id=uuid.uuid4(), name="Rewards Credit Card", type="credit_card", balance=Decimal('-1200.00'), currency="USD")
        session.add_all([acc_bank, acc_savings, acc_cc])

        # 2. Investments
        await session.execute(FinanceInvestment.__table__.delete())
        inv1 = FinanceInvestment(name="S&P 500 Index", type="mutual_fund", invested_amount=Decimal('8000.00'), current_value=Decimal('9500.00'), purchase_date=date(2022, 1, 15))
        inv2 = FinanceInvestment(name="Bitcoin", type="crypto", invested_amount=Decimal('2000.00'), current_value=Decimal('4200.00'), purchase_date=date(2023, 6, 10))
        inv3 = FinanceInvestment(name="Tech Stocks", type="stock", invested_amount=Decimal('3500.00'), current_value=Decimal('3100.00'), purchase_date=date(2023, 11, 20))
        session.add_all([inv1, inv2, inv3])

        # 3. Loans
        await session.execute(FinanceLoan.__table__.delete())
        loan1 = FinanceLoan(name="Auto Loan", loan_type="car", lender="Chase", principal_amount=Decimal('25000'), outstanding_amount=Decimal('18500'), interest_rate=Decimal('4.5'), emi_amount=Decimal('450'), emi_day=15)
        loan2 = FinanceLoan(name="Student Loan", loan_type="education", lender="Navient", principal_amount=Decimal('40000'), outstanding_amount=Decimal('32000'), interest_rate=Decimal('6.8'), emi_amount=Decimal('320'), emi_day=28)
        session.add_all([loan1, loan2])

        # 4. Bills
        await session.execute(FinanceBill.__table__.delete())
        bill1 = FinanceBill(name="Electricity", amount=Decimal('120.00'), due_day=5, category="Utilities", is_autopay=True)
        bill2 = FinanceBill(name="Internet", amount=Decimal('79.99'), due_day=12, category="Utilities", is_autopay=True)
        bill3 = FinanceBill(name="Netflix", amount=Decimal('15.49'), due_day=20, category="Subscriptions", is_autopay=True)
        bill4 = FinanceBill(name="Gym Membership", amount=Decimal('49.00'), due_day=1, category="Health", is_autopay=True)
        session.add_all([bill1, bill2, bill3, bill4])

        # 5. Goals
        await session.execute(FinancialGoal.__table__.delete())
        goal1 = FinancialGoal(name="Emergency Fund", target_amount=Decimal('20000.00'), current_amount=Decimal('15000.00'), target_date=date(2025, 12, 31), color="emerald")
        goal2 = FinancialGoal(name="Europe Vacation", target_amount=Decimal('5000.00'), current_amount=Decimal('1200.00'), target_date=date(2024, 8, 15), color="blue")
        session.add_all([goal1, goal2])

        # 6. Budget
        await session.execute(BudgetLimit.__table__.delete())
        session.add_all([
            BudgetLimit(category="Groceries", monthly_limit=Decimal('600.00')),
            BudgetLimit(category="Dining Out", monthly_limit=Decimal('300.00')),
            BudgetLimit(category="Entertainment", monthly_limit=Decimal('200.00')),
            BudgetLimit(category="Transport", monthly_limit=Decimal('150.00'))
        ])

        # 7. Expenses
        await session.execute(FinanceExpense.__table__.delete())
        now = datetime.utcnow()
        expenses = [
            ("Groceries", Decimal('120.50'), "Whole Foods", acc_cc.id),
            ("Dining Out", Decimal('45.00'), "Sushi Place", acc_cc.id),
            ("Transport", Decimal('35.00'), "Uber", acc_cc.id),
            ("Entertainment", Decimal('60.00'), "Movie Tickets", acc_bank.id),
            ("Groceries", Decimal('85.20'), "Trader Joe's", acc_cc.id),
        ]
        for cat, amt, desc, acc_id in expenses:
            session.add(FinanceExpense(logged_at=now - timedelta(days=2), amount=amt, category=cat, description=desc, account_id=acc_id))

        # ---- HEALTH ----
        # 1. Health Logs
        await session.execute(HealthLog.__table__.delete())
        session.add_all([
            HealthLog(logged_at=now, entry_type="weight", value=Decimal('75.5'), unit="kg"),
            HealthLog(logged_at=now - timedelta(days=1), entry_type="weight", value=Decimal('75.8'), unit="kg"),
            HealthLog(logged_at=now - timedelta(days=2), entry_type="weight", value=Decimal('76.1'), unit="kg"),
            HealthLog(logged_at=now, entry_type="water", value=Decimal('2.5'), unit="L"),
            HealthLog(logged_at=now, entry_type="gym", value=Decimal('1')),
        ])

        # 2. Workout Sessions
        await session.execute(WorkoutSet.__table__.delete())
        await session.execute(WorkoutSession.__table__.delete())
        ws = WorkoutSession(id=uuid.uuid4(), name="Push Day", logged_at=now)
        session.add(ws)
        session.add_all([
            WorkoutSet(session_id=ws.id, exercise="Bench Press", set_number=1, reps=10, weight_kg=Decimal('60')),
            WorkoutSet(session_id=ws.id, exercise="Bench Press", set_number=2, reps=8, weight_kg=Decimal('65')),
            WorkoutSet(session_id=ws.id, exercise="Overhead Press", set_number=1, reps=12, weight_kg=Decimal('40')),
        ])

        await session.commit()
        print("Rich Dummy Data Seeded Successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
