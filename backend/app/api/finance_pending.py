import uuid
from datetime import datetime, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.finance import FinancePendingTransaction
from app.services.finance.pending import commit_pending_to_ledger, ledger_duplicate

router = APIRouter()


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


async def _approve_one(db, user: User, pending: FinancePendingTransaction, data: dict) -> None:
    """Validate overrides and commit one pending row. Raises HTTPException on
    bad input or ledger duplicates; caller handles session commit."""
    final_amount = data.get("amount", pending.amount)
    final_type = data.get("transaction_type", pending.transaction_type)
    if final_type not in ("expense", "income"):
        final_type = "expense"
    final_category_id = data.get("category_id") or pending.category_id or None
    final_account_id = data.get("account_id") or pending.account_id
    final_desc = data.get("description") or pending.description or (
        f"Payee: {pending.payee_name}" if pending.payee_name else "Transaction"
    )

    if final_category_id and isinstance(final_category_id, str):
        final_category_id = uuid.UUID(final_category_id)
    if final_account_id and isinstance(final_account_id, str):
        final_account_id = uuid.UUID(final_account_id)

    if await ledger_duplicate(db, user.id, final_type, pending.logged_at, final_amount):
        raise HTTPException(
            status_code=409,
            detail="A ledger transaction with this amount already exists on that day — dismiss this instead.",
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
    body: dict,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Approve many pending transactions at once. Optional account_id applies
    to rows that don't already have one. Duplicates are skipped, not fatal."""
    ids = body.get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=422, detail="ids is required")
    account_id = body.get("account_id") or None

    approved = 0
    skipped: list[dict] = []
    for raw_id in ids[:100]:
        try:
            pid = uuid.UUID(str(raw_id))
        except ValueError:
            skipped.append({"id": str(raw_id), "reason": "invalid id"})
            continue
        pending = await db.get(FinancePendingTransaction, pid)
        if not pending or pending.user_id != user.id or pending.status != "pending":
            skipped.append({"id": str(raw_id), "reason": "not found or already processed"})
            continue
        data = {"account_id": account_id} if (account_id and not pending.account_id) else {}
        try:
            await _approve_one(db, user, pending, data)
            approved += 1
        except HTTPException as e:
            skipped.append({"id": str(raw_id), "reason": e.detail})
    await db.commit()
    return {"approved": approved, "skipped": skipped}


@router.post("/bulk-dismiss")
async def bulk_dismiss_pending(
    body: dict,
    db=Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    ids = body.get("ids") or []
    if not isinstance(ids, list) or not ids:
        raise HTTPException(status_code=422, detail="ids is required")
    dismissed = 0
    for raw_id in ids[:100]:
        try:
            pid = uuid.UUID(str(raw_id))
        except ValueError:
            continue
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
    data: dict,  # allow the frontend to pass updated amount, category, account, etc.
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
