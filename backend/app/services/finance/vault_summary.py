"""Write a monthly finance summary into the Obsidian vault (owner-only).

The shared vault belongs to exactly one user (see services/vault_sync/owner), so this is a no-op
for every other tenant. Each section is best-effort — a failing query degrades one line rather
than aborting the whole report. Runs monthly from APScheduler.
"""
import asyncio
import logging
import uuid
from datetime import date, datetime

from sqlalchemy import func
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.finance import (
    Account,
    AccountType,
    BudgetLimit,
    CCBill,
    FinanceExpense,
    FinanceIncome,
    FinanceInvestment,
    FinanceLoan,
    ObligationPayment,
)
from app.services.vault_sync.owner import is_vault_owner
from app.services.vault_sync.writer import VaultWriteGuard, VaultWriteError

logger = logging.getLogger(__name__)

SUMMARY_PATH = "01-finance/monthly-summary.md"


def _fmt(amount) -> str:
    return f"₹{float(amount):,.0f}"


def _month_bounds(today: date) -> tuple[datetime, datetime, str]:
    start = datetime(today.year, today.month, 1)
    end = datetime(start.year + 1, 1, 1) if start.month == 12 else datetime(start.year, start.month + 1, 1)
    return start, end, start.strftime("%Y-%m")


async def build_summary(session, user_id: uuid.UUID) -> str:
    today = date.today()
    start, end, period = _month_bounds(today)
    lines: list[str] = [
        f"# Finance — {start.strftime('%B %Y')}",
        f"_Auto-generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} by AIOS Finance OS._",
        "",
    ]

    async def _scalar(query) -> float:
        return float((await session.execute(query)).scalar_one() or 0)

    # Cashflow
    try:
        income = await _scalar(
            select(func.coalesce(func.sum(FinanceIncome.amount), 0))
            .where(FinanceIncome.user_id == user_id, FinanceIncome.logged_at >= start, FinanceIncome.logged_at < end, FinanceIncome.deleted_at.is_(None))
        )
        expense = await _scalar(
            select(func.coalesce(func.sum(FinanceExpense.amount), 0))
            .where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= start, FinanceExpense.logged_at < end, FinanceExpense.deleted_at.is_(None))
        )
        saved = income - expense
        rate = f"{(saved / income * 100):.0f}%" if income > 0 else "—"
        lines += [
            "## Cashflow",
            f"- Income: {_fmt(income)}",
            f"- Spent: {_fmt(expense)}",
            f"- Saved: {_fmt(saved)} ({rate} of income)",
            "",
        ]
    except Exception as e:
        logger.warning("summary cashflow failed: %s", e)

    # Top categories
    try:
        rows = (
            await session.execute(
                select(FinanceExpense.category, func.sum(FinanceExpense.amount))
                .where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= start, FinanceExpense.logged_at < end, FinanceExpense.deleted_at.is_(None))
                .group_by(FinanceExpense.category)
                .order_by(func.sum(FinanceExpense.amount).desc())
                .limit(6)
            )
        ).all()
        if rows:
            lines.append("## Top spend categories")
            lines += [f"- {cat or 'Uncategorized'}: {_fmt(amt)}" for cat, amt in rows]
            lines.append("")
    except Exception as e:
        logger.warning("summary categories failed: %s", e)

    # Budgets planned vs actual
    try:
        budgets = (await session.execute(select(BudgetLimit).where(BudgetLimit.user_id == user_id))).scalars().all()
        if budgets:
            planned = sum(float(b.monthly_limit) for b in budgets)
            lines += ["## Budget (planned vs actual)", f"- Planned: {_fmt(planned)} across {len(budgets)} categories", ""]
    except Exception as e:
        logger.warning("summary budgets failed: %s", e)

    # Payables checklist
    try:
        payments = {
            (p.obligation_type, p.obligation_id): p
            for p in (
                await session.execute(
                    select(ObligationPayment).where(
                        ObligationPayment.user_id == user_id, ObligationPayment.period == period
                    )
                )
            ).scalars().all()
        }
        bills = (await session.execute(select(FinanceLoan).where(FinanceLoan.user_id == user_id, FinanceLoan.is_active == True, FinanceLoan.deleted_at.is_(None)))).scalars().all()  # noqa: E712
        cc = (await session.execute(select(CCBill).where(CCBill.user_id == user_id).where(CCBill.due_date >= start.date()).where(CCBill.due_date < end.date()))).scalars().all()
        pay_lines = []
        for l in bills:
            p = payments.get(("loan", l.id))
            mark = "x" if p and p.paid else " "
            pay_lines.append(f"- [{mark}] {l.name} EMI — {_fmt(l.emi_amount)}")
        for c in cc:
            p = payments.get(("cc_bill", c.id))
            mark = "x" if p and p.paid else " "
            pay_lines.append(f"- [{mark}] {c.card_name or 'Credit Card'} bill — {_fmt(c.total_due)}")
        if pay_lines:
            lines += ["## Payables this month", *pay_lines, ""]
    except Exception as e:
        logger.warning("summary payables failed: %s", e)

    # EMIs / loans
    try:
        loans = (await session.execute(select(FinanceLoan).where(FinanceLoan.user_id == user_id, FinanceLoan.is_active == True, FinanceLoan.deleted_at.is_(None)))).scalars().all()  # noqa: E712
        if loans:
            outstanding = sum(float(l.outstanding_amount) for l in loans)
            emi = sum(float(l.emi_amount) for l in loans)
            lines += ["## Loans / EMIs", f"- Outstanding: {_fmt(outstanding)} across {len(loans)} loans", f"- Monthly EMI: {_fmt(emi)}", ""]
    except Exception as e:
        logger.warning("summary loans failed: %s", e)

    # Investments committed vs actual
    try:
        inv = (await session.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == user_id, FinanceInvestment.deleted_at.is_(None)))).scalars().all()
        if inv:
            invested = sum(float(i.invested_amount) for i in inv)
            current = sum(float(i.current_value) for i in inv)
            committed = sum(float(i.committed_monthly) for i in inv if i.committed_monthly is not None)
            lines += [
                "## Investments",
                f"- Invested: {_fmt(invested)} · Current value: {_fmt(current)}",
                f"- Committed monthly (SIP): {_fmt(committed)}",
                "",
            ]
    except Exception as e:
        logger.warning("summary investments failed: %s", e)

    # Account balances
    try:
        accounts = (await session.execute(select(Account).where(Account.user_id == user_id).order_by(Account.name))).scalars().all()
        if accounts:
            lines.append("## Accounts")
            for a in accounts:
                tag = " (credit card)" if a.type == AccountType.CREDIT_CARD else ""
                lines.append(f"- {a.name}{tag}: {_fmt(a.balance)}")
            lines.append("")
    except Exception as e:
        logger.warning("summary accounts failed: %s", e)

    return "\n".join(lines).rstrip() + "\n"


async def run_finance_vault_summary(user_id: uuid.UUID) -> None:
    """Owner-only: write the monthly finance summary markdown into the vault."""
    settings = get_settings()
    if not settings.vault_sync_enabled:
        return
    if not await is_vault_owner(user_id):
        return
    async with AsyncSessionLocal() as session:
        content = await build_summary(session, user_id)
    try:
        guard = VaultWriteGuard(settings.vault_path)
        await asyncio.to_thread(guard.update_context, SUMMARY_PATH, content)
        logger.info("Wrote finance monthly summary to vault for %s", user_id)
    except VaultWriteError as e:
        logger.warning("Vault summary write rejected: %s", e)
