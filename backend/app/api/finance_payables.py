"""Month-end payables checklist + credit-card bill CRUD.

The payables view unifies recurring bills, loan EMIs, and CC statement dues into one
"what I owe this month, to whom, from which account, paid?" list. Mounted under
/api/areas/finance by the finance router.
"""
import uuid
from datetime import date, datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.finance import (
    Account,
    CCBill,
    FinanceBill,
    FinanceLoan,
    ObligationPayment,
)
from app.models.user import User

router = APIRouter()

_VALID_TYPES = {"bill", "loan", "cc_bill"}


def _period_range(month: Optional[str]) -> tuple[str, date, date]:
    """Return (period 'YYYY-MM', month_start, month_end) — defaults to the current month."""
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m").date().replace(day=1)
        except ValueError:
            start = date.today().replace(day=1)
    else:
        start = date.today().replace(day=1)
    end = start.replace(year=start.year + 1, month=1) if start.month == 12 else start.replace(month=start.month + 1)
    return start.strftime("%Y-%m"), start, end


@router.get("/payables")
async def payables(
    month: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Unified month-end checklist: bills + EMIs + CC dues with paid/unpaid state."""
    period, start, end = _period_range(month)

    accounts = (
        await db.execute(select(Account).where(Account.user_id == user.id))
    ).scalars().all()
    acc_name = {a.id: a.name for a in accounts}

    bills = (
        await db.execute(
            select(FinanceBill).where(
                FinanceBill.user_id == user.id, FinanceBill.is_active == True  # noqa: E712
            )
        )
    ).scalars().all()
    loans = (
        await db.execute(
            select(FinanceLoan).where(
                FinanceLoan.user_id == user.id, FinanceLoan.is_active == True  # noqa: E712
            )
        )
    ).scalars().all()
    cc_bills = (
        await db.execute(
            select(CCBill)
            .where(CCBill.user_id == user.id)
            .where((CCBill.due_date >= start) & (CCBill.due_date < end))
        )
    ).scalars().all()

    payments = (
        await db.execute(
            select(ObligationPayment).where(
                ObligationPayment.user_id == user.id, ObligationPayment.period == period
            )
        )
    ).scalars().all()
    paid_map = {(p.obligation_type, p.obligation_id): p for p in payments}

    items: list[dict] = []

    def _paid(kind: str, oid: uuid.UUID) -> dict:
        p = paid_map.get((kind, oid))
        return {
            "paid": bool(p and p.paid),
            "paid_at": p.paid_at.isoformat() if p and p.paid_at else None,
            "paid_from_account_id": str(p.account_id) if p and p.account_id else None,
        }

    for b in bills:
        items.append({
            "type": "bill", "id": str(b.id), "name": b.name,
            "amount": float(b.amount), "category": b.category,
            "due_day": b.due_day, "due_date": None,
            "account_id": str(b.account_id) if b.account_id else None,
            "account_name": acc_name.get(b.account_id),
            "is_auto_debit": b.is_auto_debit, **_paid("bill", b.id),
        })
    for l in loans:
        items.append({
            "type": "loan", "id": str(l.id), "name": f"{l.name} (EMI)",
            "amount": float(l.emi_amount), "category": "EMI",
            "due_day": l.emi_day, "due_date": None,
            "account_id": str(l.account_id) if l.account_id else None,
            "account_name": acc_name.get(l.account_id),
            "is_auto_debit": False, **_paid("loan", l.id),
        })
    for c in cc_bills:
        items.append({
            "type": "cc_bill", "id": str(c.id),
            "name": c.card_name or "Credit Card Bill",
            "amount": float(c.total_due), "category": "Credit Card",
            "min_due": float(c.min_due) if c.min_due is not None else None,
            "due_day": None,
            "due_date": c.due_date.isoformat() if c.due_date else None,
            "account_id": str(c.account_id) if c.account_id else None,
            "account_name": acc_name.get(c.account_id),
            "is_auto_debit": False, **_paid("cc_bill", c.id),
        })

    total = sum(i["amount"] for i in items)
    total_paid = sum(i["amount"] for i in items if i["paid"])
    return {
        "month": period,
        "items": items,
        "total": total,
        "total_paid": total_paid,
        "total_unpaid": total - total_paid,
    }


class PayToggle(BaseModel):
    obligation_type: str
    obligation_id: uuid.UUID
    period: str  # "YYYY-MM"
    paid: bool = True
    account_id: Optional[uuid.UUID] = None
    paid_amount: Optional[float] = None


async def _owns_obligation(db, user_id, kind: str, oid: uuid.UUID) -> bool:
    model = {"bill": FinanceBill, "loan": FinanceLoan, "cc_bill": CCBill}[kind]
    row = await db.get(model, oid)
    return bool(row and row.user_id == user_id)


@router.post("/payables/pay")
async def toggle_paid(
    body: PayToggle,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    """Mark an obligation paid/unpaid for a month (drives the checklist)."""
    if body.obligation_type not in _VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"obligation_type must be one of {_VALID_TYPES}")
    if not await _owns_obligation(db, user.id, body.obligation_type, body.obligation_id):
        raise HTTPException(status_code=404, detail="Obligation not found")

    existing = (
        await db.execute(
            select(ObligationPayment).where(
                ObligationPayment.user_id == user.id,
                ObligationPayment.obligation_type == body.obligation_type,
                ObligationPayment.obligation_id == body.obligation_id,
                ObligationPayment.period == body.period,
            )
        )
    ).scalar_one_or_none()

    now = datetime.utcnow()
    if existing:
        existing.paid = body.paid
        existing.paid_at = now if body.paid else None
        existing.account_id = body.account_id
        existing.paid_amount = body.paid_amount
        row = existing
    else:
        row = ObligationPayment(
            user_id=user.id,
            obligation_type=body.obligation_type,
            obligation_id=body.obligation_id,
            period=body.period,
            paid=body.paid,
            paid_at=now if body.paid else None,
            account_id=body.account_id,
            paid_amount=body.paid_amount,
        )
    db.add(row)

    # Mirror onto the CC bill so its own paid state stays consistent.
    if body.obligation_type == "cc_bill":
        cc = await db.get(CCBill, body.obligation_id)
        if cc:
            cc.paid_at = now if body.paid else None
            cc.paid_amount = body.paid_amount if body.paid else None
            db.add(cc)

    await db.commit()
    await db.refresh(row)
    return row


# ── CC bills CRUD ─────────────────────────────────────────────────────────────
@router.get("/cc-bills", response_model=List[CCBill])
async def list_cc_bills(
    db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)
) -> Any:
    result = await db.execute(
        select(CCBill).where(CCBill.user_id == user.id).order_by(CCBill.due_date.desc())
    )
    return result.scalars().all()


class CCBillCreate(BaseModel):
    account_id: Optional[uuid.UUID] = None
    card_name: Optional[str] = None
    statement_date: Optional[date] = None
    due_date: Optional[date] = None
    total_due: float = Field(gt=0)
    min_due: Optional[float] = None
    unbilled: Optional[float] = None


@router.post("/cc-bills", response_model=CCBill)
async def create_cc_bill(
    body: CCBillCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    bill = CCBill(user_id=user.id, **body.model_dump())
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


class CCBillUpdate(BaseModel):
    account_id: Optional[uuid.UUID] = None
    card_name: Optional[str] = None
    statement_date: Optional[date] = None
    due_date: Optional[date] = None
    total_due: Optional[float] = None
    min_due: Optional[float] = None
    unbilled: Optional[float] = None


@router.patch("/cc-bills/{bill_id}", response_model=CCBill)
async def update_cc_bill(
    bill_id: uuid.UUID,
    body: CCBillUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    bill = await db.get(CCBill, bill_id)
    if not bill or bill.user_id != user.id:
        raise HTTPException(status_code=404, detail="CC bill not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.delete("/cc-bills/{bill_id}")
async def delete_cc_bill(
    bill_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> Any:
    bill = await db.get(CCBill, bill_id)
    if not bill or bill.user_id != user.id:
        raise HTTPException(status_code=404, detail="CC bill not found")
    await db.delete(bill)
    await db.commit()
    return {"status": "deleted"}
