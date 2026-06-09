import asyncio
from datetime import date, datetime, timezone
from decimal import Decimal
from sqlmodel import Session, select
from app.db.session import engine
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit

async def seed_data():
    async with engine.begin() as conn:
        # Since we use async engine, we can use run_sync for simplicity if needed, but SQLModel provides AsyncSession or we just use raw SQL via text if we want, but SQLModel supports asyncio in newer versions.
        pass

    # Actually, SQLAlchemy 2.0 with async needs AsyncSession
    from sqlalchemy.ext.asyncio import AsyncSession
    async with AsyncSession(engine) as session:
        # 1. FinanceSnapshot
        # Clear existing
        await session.execute(FinanceSnapshot.__table__.delete())
        
        snapshot = FinanceSnapshot(
            snapshot_month=date(2023, 5, 1), # May 2023 based on image
            salary=Decimal('6750.00'), # Income
            take_home=Decimal('6750.00'),
            net_worth=Decimal('5318.00'), # Profit
            cc_debt=Decimal('3540.00'), # Visa Card balance
            total_expenses=Decimal('1440.00'),
            is_estimated=False
        )
        session.add(snapshot)

        # 2. BudgetLimit
        await session.execute(BudgetLimit.__table__.delete())
        session.add(BudgetLimit(category="Total Expenses", monthly_limit=Decimal('4000.00')))

        # 3. FinanceExpense
        await session.execute(FinanceExpense.__table__.delete())
        
        # Donut Chart expenses total 2540 DH (Wait, earlier total_expenses is 1440, maybe they are different? Let's just use what's in the donut)
        expenses = [
            ("Home", Decimal('800.00')),
            ("Family Care", Decimal('600.00')),
            ("Rent", Decimal('700.00')),
            ("Groceries", Decimal('300.00')),
            ("Clothes", Decimal('140.00')),
            # Last Transactions
            ("Subscriptions", Decimal('19.99'), "Netflix"),
            ("Subscriptions", Decimal('9.99'), "Apple TV+"),
        ]
        
        for cat, amt, *desc in expenses:
            session.add(FinanceExpense(
                logged_at=datetime.utcnow(),
                amount=amt,
                category=cat,
                description=desc[0] if desc else None
            ))
            
        await session.commit()
        print("Dummy data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
