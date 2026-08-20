import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.finance import Account, Category, FinancePendingTransaction
from app.services.finance.pending import (
    AccountNotFound,
    commit_pending_to_ledger,
    ledger_duplicate,
)

router = APIRouter()


class PendingApprove(BaseModel):
    """Overrides the reviewer may apply while approving one pending row.

    This was a bare `dict`, which meant a malformed `category_id` reached
    `uuid.UUID()` as an uncaught ValueError (500 instead of 422), a
    non-numeric amount reached Decimal as an InvalidOperation, and a NEGATIVE
    amount on an expense *increased* the account balance — while every other
    finance create path enforces amount > 0.
    """

    amount: Optional[Decimal] = Field(default=None, gt=0)
    transaction_type: Optional[Literal["expense", "income"]] = None
    category_id: Optional[uuid.UUID] = None
    account_id: Optional[uuid.UUID] = None
    description: Optional[str] = Field(default=None, max_length=500)
    # The same-day/same-amount duplicate check is a hint, not proof; the client
    # re-sends with force=true once the user has confirmed it is a real second
    # transaction.
    force: bool = False


class PendingBulkApprove(BaseModel):
    ids: List[uuid.UUID] = Field(min_length=1, max_length=100)
    # Applied only to rows that don't already carry an account.
    account_id: Optional[uuid.UUID] = None


class PendingBulkDismiss(BaseModel):
    ids: List[uuid.UUID] = Field(min_length=1, max_length=100)


def _pending_out(row: FinancePendingTransaction, last_account: dict) -> dict:
    out = row.model_dump()
    # Pre-fill the account picker with the account last used for this inbox.
    out["suggested_account_id"] = row.account_id or last_account.get(row.source_account_email)
    return out


@router.get("/")
async def list_pending_transactions(
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """List all pending transactions waiting for review."""
    result = await db.execute(
        select(FinancePendingTransaction)
        .where(FinancePendingTransaction.user_id == user.id)
        .where(FinancePendingTransaction.status == "pending")
        .order_by(FinancePendingTransaction.logged_at.desc())
    )
    rows = result.scalars().all()

    approved = (await db.execute(
        select(FinancePendingTransaction)
        .where(FinancePendingTransaction.user_id == user.id)
        .where(FinancePendingTransaction.status == "approved")
        .where(FinancePendingTransaction.source_account_email.is_not(None))
        .where(FinancePendingTransaction.account_id.is_not(None))
        .order_by(FinancePendingTransaction.created_at.desc())
        .limit(200)
    )).scalars().all()
    last_account: dict = {}
    for r in approved:  # newest first — first hit per inbox wins
        last_account.setdefault(r.source_account_email, r.account_id)

    return [_pending_out(r, last_account) for r in rows]


@router.get("/stats")
async def pending_stats(
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Queue counters for the inbox header.

    Separate from the list endpoint deliberately — that one returns a bare
    array and every caller indexes it, so widening it into an object would
    break them all.
    """
    day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    waiting = (await db.execute(
        select(FinancePendingTransaction)
        .where(FinancePendingTransaction.user_id == user.id)
        .where(FinancePendingTransaction.status == "pending")
    )).scalars().all()

    filed_today = (await db.execute(
        select(FinancePendingTransaction)
        .where(FinancePendingTransaction.user_id == user.id)
        .where(FinancePendingTransaction.status == "approved")
        .where(FinancePendingTransaction.committed_at.is_not(None))
        .where(FinancePendingTransaction.committed_at >= day_start)
    )).scalars().all()

    return {
        "pending_count": len(waiting),
        "oldest_pending_at": min(
            (r.logged_at for r in waiting), default=None
        ),
        "filed_automatically_today": sum(1 for r in filed_today if r.auto_committed),
        "filed_manually_today": sum(1 for r in filed_today if not r.auto_committed),
    }


async def _approve_one(
    db, user: User, pending: FinancePendingTransaction, data: PendingApprove
) -> None:
    """Validate overrides and commit one pending row. Raises HTTPException on
    bad input or ledger duplicates; caller handles session commit."""
    final_amount = data.amount if data.amount is not None else pending.amount
    final_type = data.transaction_type or pending.transaction_type
    if final_type not in ("expense", "income"):
        final_type = "expense"
    final_category_id = data.category_id or pending.category_id or None
    final_account_id = data.account_id or pending.account_id
    final_desc = data.description or pending.description or (
        f"Payee: {pending.payee_name}" if pending.payee_name else "Transaction"
    )

    # An account is required, exactly as it is on manual expense/income create.
    # Without one apply_balance() no-ops, so the row lands in the ledger while
    # no account balance moves — money that was spent from nowhere.
    if final_account_id is None:
        raise HTTPException(
            status_code=422,
            detail="Pick an account before approving — without one the balance cannot be updated.",
        )

    # Resolved BEFORE anything is written. It was never ownership-checked, so an
    # id belonging to nobody (or to another tenant) wrote a ledger row while
    # apply_balance silently declined to move any balance — a 200 hiding an
    # inconsistency. Mirrors _adjust_balance's 404 in api/areas/finance.py.
    account = (await db.execute(
        select(Account).where(Account.id == final_account_id, Account.user_id == user.id)
    )).scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # A category the reviewer explicitly chose must exist; one merely inherited
    # from ingestion is allowed to have gone stale and degrades to
    # "Uncategorized" inside commit_pending_to_ledger.
    if data.category_id is not None:
        owns_category = (await db.execute(
            select(Category.id).where(
                Category.id == data.category_id, Category.user_id == user.id
            )
        )).scalar_one_or_none()
        if not owns_category:
            raise HTTPException(status_code=404, detail="Category not found")

    # Same-day + same-amount + same-kind is a HINT, not proof: two genuine ₹100
    # purchases on one day collide here. So this is overridable rather than
    # fatal — the client re-sends with force=true after confirming.
    if not data.force and await ledger_duplicate(
        db, user.id, final_type, pending.logged_at, final_amount
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "There is already a transaction of this amount on that day. "
                "Approve again to file it anyway, or dismiss it."
            ),
        )

    await commit_pending_to_ledger(
        db, user.id, pending,
        amount=final_amount,
        kind=final_type,
        category_id=final_category_id,
        account_id=final_account_id,
        description=final_desc,
        source="upi-tracker",
    )
    pending.status = "approved"
    # Explicitly false: this path is a human pressing Approve, even when an
    # auto-commit deadline was also pending on the row.
    pending.auto_committed = False
    pending.committed_at = datetime.utcnow()
    db.add(pending)


@router.post("/bulk-approve")
async def bulk_approve_pending(
    body: PendingBulkApprove,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Approve many pending transactions at once. Optional account_id applies
    to rows that don't already have one. Duplicates are skipped, not fatal."""
    approved = 0
    skipped: list[dict] = []
    for pid in body.ids:
        pending = await db.get(FinancePendingTransaction, pid)
        if not pending or pending.user_id != user.id or pending.status != "pending":
            skipped.append({"id": str(pid), "reason": "not found or already processed"})
            continue
        data = PendingApprove(
            account_id=body.account_id if (body.account_id and not pending.account_id) else None
        )
        try:
            await _approve_one(db, user, pending, data)
            approved += 1
        except (HTTPException, AccountNotFound) as e:
            skipped.append({
                "id": str(pid),
                "reason": e.detail if isinstance(e, HTTPException) else "account not found",
            })
    await db.commit()
    return {"approved": approved, "skipped": skipped}


@router.post("/bulk-dismiss")
async def bulk_dismiss_pending(
    body: PendingBulkDismiss,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    dismissed = 0
    for pid in body.ids:
        pending = await db.get(FinancePendingTransaction, pid)
        if pending and pending.user_id == user.id and pending.status == "pending":
            pending.status = "dismissed"
            db.add(pending)
            dismissed += 1
    await db.commit()
    return {"dismissed": dismissed}


@router.post("/{transaction_id}/approve", response_model=FinancePendingTransaction)
async def approve_pending_transaction(
    transaction_id: uuid.UUID,
    data: PendingApprove,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Approve a pending transaction and commit it to the ledger."""
    pending = await db.get(FinancePendingTransaction, transaction_id)
    if not pending or pending.user_id != user.id:
        raise HTTPException(status_code=404, detail="Pending transaction not found")

    if pending.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction already processed")

    await _approve_one(db, user, pending, data)
    await db.commit()
    await db.refresh(pending)
    return pending


@router.post("/{transaction_id}/dismiss", response_model=FinancePendingTransaction)
async def dismiss_pending_transaction(
    transaction_id: uuid.UUID,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Dismiss a pending transaction without committing it to the ledger."""
    pending = await db.get(FinancePendingTransaction, transaction_id)
    if not pending or pending.user_id != user.id:
        raise HTTPException(status_code=404, detail="Pending transaction not found")

    pending.status = "dismissed"
    db.add(pending)
    await db.commit()
    await db.refresh(pending)

    return pending
