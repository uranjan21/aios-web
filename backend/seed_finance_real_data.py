"""Seed real 2026 Money Manager export into finance tables.

Source: data_finance_2026.json (139 rows exported from the user's Money Manager
app, 2026-05-08 .. 2026-06-14). Wipes and rebuilds finance_expenses,
finance_income, finance_transfers, finance_categories, finance_accounts so the
Finance UI can be exercised against real categories/subcategories/accounts.

Rows are processed oldest-first. "Income Balance" / "Expense Balance" /
"Credit Cards: Current due" rows are the user's starting-balance reconciliation
entries — since they're the earliest rows, treating them as normal
income/expense against a zero-balance account naturally yields the correct
starting balance (negative for credit cards / loan, positive for bank accounts).
"""
import asyncio
import json
import uuid
from datetime import datetime
from decimal import Decimal
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db.session import engine
from app.models.finance import Account, Category, FinanceExpense, FinanceIncome, FinanceTransfer

DATA_FILE = Path(__file__).parent / "data_finance_2026.json"

ACCOUNT_TYPES = {
    "Axis - Flipkart": "credit_card",
    "Axis - Horizon": "credit_card",
    "Cash": "checking",
    "Emergency AC (SBI)": "savings",
    "Friends/Others": "checking",
    "HDFC - Swiggy": "credit_card",
    "HDFC - Tata Neu": "credit_card",
    "ICICI - Amazon Pay": "credit_card",
    "ICICI - Personal Loan": "loan",
    "ICICI - Rubics": "credit_card",
    "Salary AC (ICICI)": "savings",
    "Saving AC (HDFC)": "savings",
    "Spending AC (PNB)": "checking",
    "Splitwise": "checking",
}

CATEGORY_TREE = {
    "💰 Salary": [],
    "Food & Grocery": ["Eating Out", "Grocery / Blinkit / Zepto", "Online food (Swiggy / Zomato)", "Snacks & Bevrages"],
    "Bills & Household": ["Bill - Aquaguard", "Bill - Mobile Recharge", "Bill - Water & Electricity", "Bill - renticle wardrobe", "Rent - Flat / House"],
    "Transportation": ["Cab / Auto", "Petrol", "Vehicle Service & Maintenance"],
    "Shopping & Lifestyle": ["Accessories", "Clothes", "Grooming", "Movies & Shows", "Others", "friends"],
    "Health & Fitness": ["Protein & Supplement", "Sports"],
    "Subscriptions & Digital": ["AI Tools", "Apple"],
    "Travel": ["Train / Bus Tickets"],
    "Family Support": ["Home Expenses"],
    "Loan & EMIs": ["EMI - Fridge", "Other (Loan & EMIs)"],
    "Miscellaneous": ["Donations", "Gifts", "Unexpected Expenses"],
    "Investments": [],
    "Unknown": [],
    "Other": [],
    "Modified Bal.": [],
    "Credit Cards": [],
    "Cashback": [],
}


def category_text(row: dict) -> tuple[str, str | None]:
    """Return (category_text, subcategory_key) for category lookup."""
    category = row["category"]
    subcategory = row["subcategory"]
    if category == "Loan & EMIs" and subcategory == "Other":
        return "Other (Loan & EMIs)", "Other (Loan & EMIs)"
    if subcategory:
        return subcategory, subcategory
    return category, None


async def seed():
    async with AsyncSession(engine, expire_on_commit=False) as session:
        # Wipe existing finance transaction data + taxonomy (FK-safe order)
        await session.execute(FinanceExpense.__table__.delete())
        await session.execute(FinanceIncome.__table__.delete())
        await session.execute(FinanceTransfer.__table__.delete())
        await session.execute(Category.__table__.delete())
        await session.execute(Account.__table__.delete())
        await session.commit()

        # Accounts
        accounts: dict[str, Account] = {}
        for name, acc_type in ACCOUNT_TYPES.items():
            acc = Account(id=uuid.uuid4(), name=name, type=acc_type, balance=Decimal("0"), currency="INR")
            session.add(acc)
            accounts[name] = acc

        # Categories (top-level + subcategories)
        categories: dict[tuple[str, str | None], Category] = {}
        for top, subs in CATEGORY_TREE.items():
            top_cat = Category(id=uuid.uuid4(), name=top)
            session.add(top_cat)
            categories[(top, None)] = top_cat
            for sub in subs:
                sub_cat = Category(id=uuid.uuid4(), name=sub, parent_id=top_cat.id)
                session.add(sub_cat)
                categories[(top, sub)] = sub_cat

        await session.commit()

        # Build (sub_key -> Category) map across all top-levels for direct lookup
        cat_by_key: dict[str, Category] = {}
        for (top, sub), cat in categories.items():
            if sub is not None:
                cat_by_key[sub] = cat
            else:
                cat_by_key.setdefault(top, cat)

        # Transactions, processed oldest-first
        rows = json.loads(DATA_FILE.read_text())
        rows.sort(key=lambda r: r["period"])

        n_expense = n_income = n_transfer = 0
        for row in rows:
            logged_at = datetime.fromisoformat(row["period"])
            amount = Decimal(str(row["amount"]))
            txn_type = row["type"]
            note = row["note"]

            if txn_type == "Transfer-In":
                continue  # mirrored by the Transfer-Out row

            if txn_type == "Transfer-Out":
                from_acc = accounts[row["account"]]
                to_acc = accounts[row["category"]]
                session.add(FinanceTransfer(
                    amount=amount, from_account_id=from_acc.id, to_account_id=to_acc.id,
                    description=note, logged_at=logged_at,
                ))
                from_acc.balance = Decimal(from_acc.balance) - amount
                to_acc.balance = Decimal(to_acc.balance) + amount
                n_transfer += 1
                continue

            account = accounts[row["account"]]
            cat_text, cat_key = category_text(row)
            category = cat_by_key.get(cat_key or cat_text)

            if txn_type in ("Exp.", "Expense Balance"):
                session.add(FinanceExpense(
                    logged_at=logged_at, amount=amount, category=cat_text,
                    category_id=category.id if category else None,
                    account_id=account.id, description=note, source="import",
                ))
                account.balance = Decimal(account.balance) - amount
                n_expense += 1
            elif txn_type in ("Income", "Income Balance"):
                session.add(FinanceIncome(
                    amount=amount, source=cat_text, account_id=account.id,
                    description=note, logged_at=logged_at,
                ))
                account.balance = Decimal(account.balance) + amount
                n_income += 1
            else:
                raise ValueError(f"Unhandled transaction type: {txn_type!r}")

        for acc in accounts.values():
            session.add(acc)

        await session.commit()
        print(f"Seeded {len(accounts)} accounts, {len(categories)} categories, "
              f"{n_expense} expenses, {n_income} income, {n_transfer} transfers")
        for acc in accounts.values():
            print(f"  {acc.name:<22} {acc.type:<12} {acc.balance}")


if __name__ == "__main__":
    asyncio.run(seed())
