import uuid
from datetime import datetime, timezone
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, update
from sqlmodel.ext.asyncio.session import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.finance import FinancePendingTransaction, FinanceExpense, FinanceIncome

router = APIRouter()

@router.get("/", response_model=List[FinancePendingTransaction])
async def list_pending_transactions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """List all pending transactions waiting for review."""
    result = await db.execute(
        select(FinancePendingTransaction)
        .where(FinancePendingTransaction.user_id == user.id)
        .where(FinancePendingTransaction.status == "pending")
        .order_by(FinancePendingTransaction.logged_at.desc())
    )
    return result.scalars().all()

@router.post("/{transaction_id}/approve", response_model=FinancePendingTransaction)
async def approve_pending_transaction(
    transaction_id: uuid.UUID,
    data: dict,  # allow the frontend to pass updated amount, category, account, etc.
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Approve a pending transaction and commit it to the ledger."""
    pending = await db.get(FinancePendingTransaction, transaction_id)
    if not pending or pending.user_id != user.id:
        raise HTTPException(status_code=404, detail="Pending transaction not found")
        
    if pending.status != "pending":
        raise HTTPException(status_code=400, detail="Transaction already processed")

    # Override defaults with frontend inputs if provided
    final_amount = data.get("amount", pending.amount)
    final_type = data.get("transaction_type", pending.transaction_type)
    final_category_id = data.get("category_id") or None
    final_account_id = data.get("account_id") or pending.account_id
    final_desc = data.get("description") or pending.description or f"Payee: {pending.payee_name}"
    
    if final_category_id:
        final_category_id = uuid.UUID(final_category_id)
    if final_account_id:
        final_account_id = uuid.UUID(final_account_id)

    if final_type == "expense":
        expense = FinanceExpense(
            user_id=user.id,
            amount=final_amount,
            logged_at=pending.logged_at,
            account_id=final_account_id,
            category_id=final_category_id,
            description=final_desc,
            source="upi-tracker"
        )
        db.add(expense)
    else:
        income = FinanceIncome(
            user_id=user.id,
            amount=final_amount,
            logged_at=pending.logged_at,
            account_id=final_account_id,
            category_id=final_category_id,
            description=final_desc,
            source="upi-tracker"
        )
        db.add(income)

    pending.status = "approved"
    db.add(pending)
    await db.commit()
    await db.refresh(pending)
    
    return pending

@router.post("/{transaction_id}/dismiss", response_model=FinancePendingTransaction)
async def dismiss_pending_transaction(
    transaction_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
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
