"""Pending-transaction commit helpers + the opt-in auto-commit cron.

Auto-commit is OFF by default: pending rows are created with auto_commit_at
NULL and wait for explicit review in the Finance Inbox. Only users who set
finance_settings.auto_commit_hours get timed commits, and those go through the
same unified path as manual approval: category resolved to BOTH the rollup
name and the node id, account balance adjusted, ledger-duplicate guarded.
"""
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import (
    Account,
    FinanceExpense,
    FinanceIncome,
    FinancePendingTransaction,
)

logger = logging.getLogger(__name__)


async def ledger_duplicate(session, user_id: uuid.UUID, kind: str, logged_at: datetime, amount) -> bool:
    """True when the ledger already has a same-kind/same-day/same-amount entry."""
    lo = logged_at.replace(hour=0, minute=0, second=0, microsecond=0)
    hi = lo + timedelta(days=1)
    model = FinanceExpense if kind == "expense" else FinanceIncome
    row = (await session.execute(
        select(model.id).where(
            model.user_id == user_id,
            model.logged_at >= lo,
            model.logged_at < hi,
            model.amount == Decimal(str(amount)),
        ).limit(1)
    )).scalar_one_or_none()
    return row is not None


async def apply_balance(session, account_id, delta, user_id: uuid.UUID) -> None:
    """Signed balance adjustment; no-op when there's no account or it's not the
    user's. Cron-safe twin of api.areas.finance._adjust_balance (no HTTP errors)."""
    if account_id is None:
        return
    account = (await session.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id).with_for_update()
    )).scalar_one_or_none()
    if not account:
        logger.warning("Pending commit: account %s not found for user %s", account_id, user_id)
        return
    account.balance = account.balance + Decimal(str(delta))
    session.add(account)


async def commit_pending_to_ledger(
    session,
    user_id: uuid.UUID,
    pending: FinancePendingTransaction,
    *,
    amount,
    kind: str,
    category_id,
    account_id,
    description: str,
    source: str,
) -> None:
    """Insert the ledger row (with unified category resolution) and adjust the
    account balance. Caller flips pending.status and commits the session."""
    from app.api.areas.finance import _resolve_category  # lazy: avoids circular import

    top_name, cat_id = await _resolve_category(session, category_id, user_id)
    amount = Decimal(str(amount))

    if kind == "expense":
        session.add(FinanceExpense(
            user_id=user_id,
            amount=amount,
            logged_at=pending.logged_at,
            account_id=account_id,
            category=top_name or pending.suggested_category or "Uncategorized",
            category_id=cat_id,
            description=description,
            source=source,
        ))
        await apply_balance(session, account_id, -amount, user_id)
    else:
        # FinanceIncome.source is the denormalized top-level CATEGORY name (the
        # old approve path wrongly stored "upi-tracker" there); the origin
        # marker goes in tags instead.
        session.add(FinanceIncome(
            user_id=user_id,
            amount=amount,
            logged_at=pending.logged_at,
            account_id=account_id,
            source=top_name or pending.suggested_category or "Other",
            category_id=cat_id,
            description=description,
            tags=source,
        ))
        await apply_balance(session, account_id, amount, user_id)

    pending.account_id = account_id
    pending.category_id = cat_id or category_id
    session.add(pending)


async def run_auto_commit_pending_transactions(user_id: uuid.UUID) -> None:
    """Cron: commit pending rows whose (opt-in) auto-commit window has passed."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(FinancePendingTransaction)
                .where(FinancePendingTransaction.user_id == user_id)
                .where(FinancePendingTransaction.status == "pending")
                .where(FinancePendingTransaction.auto_commit_at.is_not(None))
                .where(FinancePendingTransaction.auto_commit_at < datetime.utcnow())
            )
            pending_txs = result.scalars().all()

            committed = 0
            for pending in pending_txs:
                kind = pending.transaction_type if pending.transaction_type in ("expense", "income") else "expense"
                if await ledger_duplicate(session, user_id, kind, pending.logged_at, pending.amount):
                    # A same-day/same-amount ledger row is only a HINT of a
                    # duplicate — two real ₹100 coffees on one day look
                    # identical here. Dismissing on that guess destroyed real
                    # transactions silently, so hand it back to the human:
                    # clear the deadline (this row is no longer a cron
                    # candidate) and leave it waiting in the inbox.
                    pending.auto_commit_at = None
                    session.add(pending)
                    logger.info(
                        "Auto-commit deferred pending %s to review — possible ledger duplicate",
                        pending.id,
                    )
                    continue
                if pending.account_id is None:
                    # No account = no balance movement. Filing it anyway would
                    # book an expense that never leaves any account.
                    pending.auto_commit_at = None
                    session.add(pending)
                    logger.info("Auto-commit deferred pending %s to review — no account", pending.id)
                    continue
                description = pending.description or (
                    f"Payee: {pending.payee_name}" if pending.payee_name else "Transaction"
                )
                await commit_pending_to_ledger(
                    session, user_id, pending,
                    amount=pending.amount,
                    kind=kind,
                    category_id=pending.category_id,
                    account_id=pending.account_id,
                    description=description,
                    source="upi-tracker-auto",
                )
                pending.status = "approved"
                # Marked here, not inferred from auto_commit_at later — that
                # column is a deadline and stays set even when the user beat it.
                pending.auto_committed = True
                pending.committed_at = datetime.utcnow()
                session.add(pending)
                committed += 1

            if pending_txs:
                await session.commit()
            if committed:
                logger.info("Auto-committed %d pending transactions for user %s", committed, user_id)

    except Exception as e:
        logger.error("Failed to auto-commit transactions for user %s: %s", user_id, e)
