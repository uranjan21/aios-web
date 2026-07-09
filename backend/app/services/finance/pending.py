import logging
import uuid
from datetime import datetime
from sqlmodel import select
from app.db.session import AsyncSessionLocal
from app.models.finance import FinancePendingTransaction, FinanceExpense, FinanceIncome

logger = logging.getLogger(__name__)

async def run_auto_commit_pending_transactions(user_id: uuid.UUID) -> None:
    """Cron job that auto-commits pending transactions older than 24 hours."""
    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(
                select(FinancePendingTransaction)
                .where(FinancePendingTransaction.user_id == user_id)
                .where(FinancePendingTransaction.status == "pending")
                .where(FinancePendingTransaction.auto_commit_at < datetime.utcnow())
            )
            pending_txs = result.scalars().all()
            
            for pending in pending_txs:
                if pending.transaction_type == "expense":
                    expense = FinanceExpense(
                        user_id=user_id,
                        amount=pending.amount,
                        logged_at=pending.logged_at,
                        account_id=pending.account_id,
                        category=pending.suggested_category or "Uncategorized",
                        description=f"Payee: {pending.payee_name}" if pending.payee_name else "UPI Transaction",
                        source="upi-tracker-auto"
                    )
                    session.add(expense)
                else:
                    income = FinanceIncome(
                        user_id=user_id,
                        amount=pending.amount,
                        logged_at=pending.logged_at,
                        account_id=pending.account_id,
                        source=pending.suggested_category or "other",
                        description=f"Payer: {pending.payee_name}" if pending.payee_name else "UPI Transaction",
                        tags="upi-tracker-auto"
                    )
                    session.add(income)
                
                pending.status = "approved"
                session.add(pending)
                
            if pending_txs:
                await session.commit()
                logger.info("Auto-committed %d pending transactions for user %s", len(pending_txs), user_id)
                
    except Exception as e:
        logger.error("Failed to auto-commit transactions for user %s: %s", user_id, e)
