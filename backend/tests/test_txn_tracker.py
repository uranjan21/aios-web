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
    from app.api.finance_pending import PendingApprove, _approve_one
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
        await _approve_one(db, user, pending, PendingApprove(category_id=child.id, account_id=account.id))
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
            await _approve_one(db, user, dup, PendingApprove(account_id=account.id))
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


# ── Approve-path guards (2026-08-06) ────────────────────────────────────────
#
# These cover the three ways approving used to lose or block real money. None
# of them had coverage, which is how they survived.


async def _seed_account(db_session_factory, user_id, balance="10000.00"):
    async with db_session_factory() as db:
        acct = Account(user_id=user_id, name="Bank", type=AccountType.SAVINGS,
                       balance=Decimal(balance), currency="INR")
        db.add(acct)
        await db.commit()
        await db.refresh(acct)
        return acct


async def _seed_pending(db_session_factory, user_id, amount, *, account_id=None,
                        logged_at=datetime(2026, 7, 15, 9, 0, 0), payee="Coffee"):
    async with db_session_factory() as db:
        row = FinancePendingTransaction(
            user_id=user_id, amount=Decimal(str(amount)), transaction_type="expense",
            payee_name=payee, logged_at=logged_at, raw_email_snippet=f"Rs.{amount} debited",
            status="pending", description=payee, account_id=account_id,
        )
        db.add(row)
        await db.commit()
        await db.refresh(row)
        return row


@pytest.mark.asyncio
async def test_approve_requires_an_account(client_a, user_a, db_session_factory):
    """Without an account the balance cannot move, so the row must not be filed
    at all — otherwise money is spent from nowhere."""
    pending = await _seed_pending(db_session_factory, user_a.id, 999, account_id=None)

    resp = await client_a.post(f"/api/areas/finance/pending/{pending.id}/approve", json={})
    assert resp.status_code == 422, resp.text

    async with db_session_factory() as db:
        assert (await db.execute(select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id))).scalars().first() is None
        row = await db.get(FinancePendingTransaction, pending.id)
        assert row.status == "pending"


@pytest.mark.asyncio
async def test_same_day_same_amount_is_overridable_not_fatal(client_a, user_a, db_session_factory):
    """Two genuine purchases of the same amount on one day collide in the
    duplicate guard. The second must be filable, not forced into a dismissal."""
    acct = await _seed_account(db_session_factory, user_a.id)
    first = await _seed_pending(db_session_factory, user_a.id, 250, account_id=acct.id,
                                payee="Coffee One")
    second = await _seed_pending(db_session_factory, user_a.id, 250, account_id=acct.id,
                                 logged_at=datetime(2026, 7, 15, 17, 0, 0), payee="Coffee Two")

    assert (await client_a.post(
        f"/api/areas/finance/pending/{first.id}/approve", json={})).status_code == 200

    blocked = await client_a.post(f"/api/areas/finance/pending/{second.id}/approve", json={})
    assert blocked.status_code == 409

    forced = await client_a.post(
        f"/api/areas/finance/pending/{second.id}/approve", json={"force": True})
    assert forced.status_code == 200, forced.text

    async with db_session_factory() as db:
        rows = (await db.execute(select(FinanceExpense).where(
            FinanceExpense.user_id == user_a.id))).scalars().all()
        assert len(rows) == 2
        # Both debits landed on the balance, not just the first.
        assert (await db.get(Account, acct.id)).balance == Decimal("9500.00")


@pytest.mark.asyncio
async def test_auto_commit_defers_a_suspected_duplicate_instead_of_dismissing(
    user_a, db_session_factory
):
    """The cron used to set status='dismissed' on a same-day/same-amount match,
    destroying a real transaction with no way for the user to see it."""
    from app.services.finance.pending import run_auto_commit_pending_transactions

    acct = await _seed_account(db_session_factory, user_a.id)
    async with db_session_factory() as db:
        db.add(FinanceExpense(
            user_id=user_a.id, amount=Decimal("250.00"),
            logged_at=datetime(2026, 7, 15, 9, 0, 0), account_id=acct.id,
            category="Food", description="Already there", source="manual"))
        await db.commit()

    pending = await _seed_pending(db_session_factory, user_a.id, 250, account_id=acct.id)
    async with db_session_factory() as db:
        row = await db.get(FinancePendingTransaction, pending.id)
        row.auto_commit_at = datetime(2026, 7, 16, 9, 0, 0)  # deadline already passed
        db.add(row)
        await db.commit()

    await run_auto_commit_pending_transactions(user_a.id)

    async with db_session_factory() as db:
        row = await db.get(FinancePendingTransaction, pending.id)
        assert row.status == "pending", "a suspected duplicate must go back to the human"
        assert row.auto_commit_at is None, "and must stop being a cron candidate"
