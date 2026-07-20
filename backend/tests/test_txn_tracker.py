"""Transaction-tracker overhaul: multi-account Gmail credentials, unified
pending→ledger commit (category + balance), and statement reconciliation."""
import uuid
from datetime import datetime
from decimal import Decimal
from unittest.mock import patch

import pytest
from sqlmodel import select

from app.models.finance import (
    Account,
    AccountType,
    Category,
    FinanceExpense,
    FinancePendingTransaction,
)
from app.models.google_sync import GmailMessage
from app.models.integration import IntegrationCredential


@pytest.mark.asyncio
async def test_save_tokens_two_gmail_accounts(app, user_a, db_session_factory):
    """Linking a second Gmail account creates a second credential row instead of
    overwriting the first (the sign-in inbox is often not the bank-alert inbox)."""
    from app.services.integrations.google_oauth import save_tokens

    token_data = {"access_token": "at-1", "refresh_token": "rt-1", "expires_in": 3600,
                  "email": "personal@gmail.com", "name": "A"}
    # The conftest TOKEN_ENCRYPTION_KEY is not a real Fernet key; the behavior
    # under test is per-account row storage, not crypto.
    with patch("app.services.integrations.google_oauth.encrypt_token", side_effect=lambda t: f"enc:{t}"):
        async with db_session_factory() as db:
            await save_tokens(user_a.id, db, "gmail", token_data)
            await save_tokens(user_a.id, db, "gmail", {**token_data, "access_token": "at-2", "email": "bank@gmail.com"})
            # Reconnecting the same address updates in place, no third row.
            await save_tokens(user_a.id, db, "gmail", {**token_data, "access_token": "at-3", "email": "bank@gmail.com"})

            creds = (await db.execute(
                select(IntegrationCredential).where(
                    IntegrationCredential.user_id == user_a.id,
                    IntegrationCredential.provider == "gmail",
                )
            )).scalars().all()
            assert sorted(c.account_email for c in creds) == ["bank@gmail.com", "personal@gmail.com"]
            assert all(c.status == "connected" for c in creds)


@pytest.mark.asyncio
async def test_approve_sets_category_fields_and_balance(app, user_a, db_session_factory):
    """The unified commit path resolves BOTH category fields and adjusts the
    account balance; a same-day/same-amount ledger row blocks a duplicate."""
    from fastapi import HTTPException
    from app.api.finance_pending import _approve_one
    from app.models.user import User

    async with db_session_factory() as db:
        account = Account(user_id=user_a.id, name="HDFC", type=AccountType.CHECKING, balance=Decimal("10000.00"))
        parent = Category(user_id=user_a.id, name="Food", kind="expense")
        db.add(account)
        db.add(parent)
        await db.commit()
        await db.refresh(parent)
        child = Category(user_id=user_a.id, name="Eating out", kind="expense", parent_id=parent.id)
        db.add(child)
        await db.commit()
        await db.refresh(account)
        await db.refresh(child)

        pending = FinancePendingTransaction(
            user_id=user_a.id, amount=Decimal("450.00"), transaction_type="expense",
            payee_name="Swiggy", suggested_category="Food", logged_at=datetime(2026, 7, 19, 12, 0),
            raw_email_snippet="{}", status="pending",
        )
        db.add(pending)
        await db.commit()
        await db.refresh(pending)

        user = (await db.execute(select(User).where(User.id == user_a.id))).scalar_one()
        await _approve_one(db, user, pending, {"category_id": str(child.id), "account_id": str(account.id)})
        await db.commit()

        expense = (await db.execute(
            select(FinanceExpense).where(FinanceExpense.user_id == user_a.id)
        )).scalars().one()
        assert expense.category == "Food"          # top-level rollup name
        assert expense.category_id == child.id     # exact node
        assert expense.source == "upi-tracker"
        await db.refresh(account)
        assert account.balance == Decimal("9550.00")  # 10000 − 450
        assert pending.status == "approved"

        # Second identical pending row is now a ledger duplicate → 409.
        dup = FinancePendingTransaction(
            user_id=user_a.id, amount=Decimal("450.00"), transaction_type="expense",
            payee_name="Swiggy", logged_at=datetime(2026, 7, 19, 15, 0),
            raw_email_snippet="{}", status="pending",
        )
        db.add(dup)
        await db.commit()
        await db.refresh(dup)
        with pytest.raises(HTTPException) as exc:
            await _approve_one(db, user, dup, {"account_id": str(account.id)})
        assert exc.value.status_code == 409


@pytest.mark.asyncio
async def test_statement_reconciler_drops_ledger_matched_lines(app, user_a, db_session_factory):
    """Statement lines matching an existing ledger entry (±3d, same amount) are
    dropped — they were already captured via alerts — only new lines queue."""
    from app.services.agents.runners import run_agent_task

    async with db_session_factory() as db:
        # Already tracked via an alert on the 15th.
        db.add(FinanceExpense(
            user_id=user_a.id, amount=Decimal("999.00"), category="Shopping",
            logged_at=datetime(2026, 7, 15, 10, 0), source="upi-tracker",
        ))
        db.add(GmailMessage(
            user_id=user_a.id, account_email="bank@gmail.com", gmail_id="stmt-1",
            subject="Your Credit Card Statement", sender="statements@hdfcbank.net",
            snippet="Statement", body_text="16/07 AMAZON 999.00 ... 17/07 NEW MERCHANT 123.45",
            is_financial=True, received_at=datetime(2026, 7, 18),
        ))
        await db.commit()

    mock_json = """
    [
        {"amount": 999.00, "transaction_type": "expense", "payee_name": "Amazon", "suggested_category": "Shopping", "txn_ref": "", "logged_at": "2026-07-16", "email_index": 0},
        {"amount": 123.45, "transaction_type": "expense", "payee_name": "New Merchant", "suggested_category": "Shopping", "txn_ref": "", "logged_at": "2026-07-17", "email_index": 0}
    ]
    """

    with patch("app.services.finance.email_extraction.generate_text", return_value=mock_json):
        with patch("app.services.billing.usage.ai_allowed", return_value=True):
            result = await run_agent_task("aios-statement-reconciler", user_a.id)

    assert "queued 1 transaction" in result
    assert "Skipped 1" in result

    async with db_session_factory() as db:
        txs = (await db.execute(
            select(FinancePendingTransaction).where(FinancePendingTransaction.user_id == user_a.id)
        )).scalars().all()
        assert len(txs) == 1
        assert txs[0].payee_name == "New Merchant"
        assert txs[0].amount == Decimal("123.45")
