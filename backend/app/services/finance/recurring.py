"""Recurring auto-post engine — posts bills and loan EMIs as expenses on their due day.

Idempotent per calendar month via last_posted_period ("YYYY-MM") on each bill/loan.
Runs daily from APScheduler plus once at startup to catch up missed days.
"""
import calendar
import logging
import uuid
from datetime import datetime, timedelta
from typing import Optional

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import Account, FinanceBill, FinanceExpense, FinanceLoan

logger = logging.getLogger(__name__)


async def _adjust_balance(session, user_id: uuid.UUID, account_id: Optional[uuid.UUID], delta: float) -> None:
    if account_id is None:
        return
    result = await session.execute(select(Account).where(Account.user_id == user_id, Account.id == account_id))
    account = result.scalar_one_or_none()
    if account is None:
        logger.warning("Recurring post: account %s not found, skipping balance adjust", account_id)
        return
    account.balance = float(account.balance) + delta
    session.add(account)


def _due_date(now: datetime, due_day: int) -> datetime:
    """Due date within the current month, clamped to the month's last day."""
    last_day = calendar.monthrange(now.year, now.month)[1]
    return datetime(now.year, now.month, min(due_day, last_day))


async def post_due_recurring(user_id: uuid.UUID) -> int:
    """Post expenses for all active bills/EMIs whose due day has arrived this month."""
    from app.api.agents import _broadcast_agent

    now = datetime.utcnow()
    period = now.strftime("%Y-%m")
    posted = 0

    async with AsyncSessionLocal() as session:
        bills = (await session.execute(
            select(FinanceBill).where(FinanceBill.user_id == user_id, FinanceBill.is_active == True)
        )).scalars().all()
        loans = (await session.execute(
            select(FinanceLoan).where(FinanceLoan.user_id == user_id, FinanceLoan.is_active == True)
        )).scalars().all()

        events = []
        last_day_of_month = calendar.monthrange(now.year, now.month)[1]
        for bill in bills:
            effective_due_day = min(bill.due_day, last_day_of_month)
            if effective_due_day > now.day or bill.last_posted_period == period:
                continue
            session.add(FinanceExpense(
                user_id=user_id,
                logged_at=_due_date(now, bill.due_day),
                amount=bill.amount,
                category=bill.category,
                account_id=bill.account_id,
                description=bill.name,
                source="recurring",
            ))
            await _adjust_balance(session, user_id, bill.account_id, -float(bill.amount))
            bill.last_posted_period = period
            session.add(bill)
            events.append({"name": bill.name, "amount": float(bill.amount), "kind": "Bill"})
            posted += 1

        for loan in loans:
            effective_emi_day = min(loan.emi_day, last_day_of_month)
            if effective_emi_day > now.day or loan.last_posted_period == period:
                continue
            session.add(FinanceExpense(
                user_id=user_id,
                logged_at=_due_date(now, loan.emi_day),
                amount=loan.emi_amount,
                category="EMI",
                account_id=loan.account_id,
                description=loan.name,
                source="recurring",
            ))
            await _adjust_balance(session, user_id, loan.account_id, -float(loan.emi_amount))
            loan.last_posted_period = period
            session.add(loan)
            events.append({"name": loan.name, "amount": float(loan.emi_amount), "kind": "EMI"})
            posted += 1

        await session.commit()

    for ev in events:
        await _broadcast_agent(user_id, {"type": "recurring_posted", **ev})

    if posted:
        from app.services.finance.budget_alerts import check_budget_alerts
        await check_budget_alerts(user_id)  # recurring posts may push categories over thresholds
        logger.info("Recurring engine posted %d expense(s) for %s", posted, period)
    return posted


async def notify_due_tomorrow(user_id: uuid.UUID) -> int:
    """Push a reminder for active bills/EMIs due tomorrow that haven't posted yet."""
    from app.services.notifications.push import send_push_to_all

    tomorrow = datetime.utcnow() + timedelta(days=1)
    period = tomorrow.strftime("%Y-%m")
    notified = 0

    async with AsyncSessionLocal() as session:
        bills = (await session.execute(
            select(FinanceBill).where(FinanceBill.user_id == user_id, FinanceBill.is_active == True, FinanceBill.due_day == tomorrow.day)
        )).scalars().all()
        loans = (await session.execute(
            select(FinanceLoan).where(FinanceLoan.user_id == user_id, FinanceLoan.is_active == True, FinanceLoan.emi_day == tomorrow.day)
        )).scalars().all()

    for bill in bills:
        if bill.last_posted_period == period:
            continue
        await send_push_to_all(user_id, "Bill due tomorrow", f"{bill.name} — ₹{float(bill.amount):,.0f}", "/areas/finance")
        notified += 1
    for loan in loans:
        if loan.last_posted_period == period:
            continue
        await send_push_to_all(user_id, "EMI due tomorrow", f"{loan.name} — ₹{float(loan.emi_amount):,.0f}", "/areas/finance")
        notified += 1

    if notified:
        logger.info("Sent %d due-tomorrow reminder(s)", notified)
    return notified
