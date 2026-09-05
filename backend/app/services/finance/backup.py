"""Monthly CSV backup of all finance tables, per user (in-app job — Decision C).

Writes one CSV per table into a dated folder. Owner writes into the vault
(01-finance/backups/<date>/); everyone else backs up to a local per-user folder.
Best-effort per table so one failure doesn't abort the whole backup.
"""
import asyncio
import csv
import logging
import uuid
from datetime import date
from pathlib import Path

from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.finance import (
    Account,
    BudgetLimit,
    CCBill,
    Category,
    FinanceBill,
    FinanceExpense,
    FinanceIncome,
    FinanceInvestment,
    FinanceLoan,
    FinancePendingTransaction,
    FinanceSnapshot,
    FinanceTransfer,
    FinancialGoal,
    MerchantRule,
    ObligationPayment,
)
from app.services.vault_sync.owner import is_vault_owner

logger = logging.getLogger(__name__)

# (filename, model) — every finance table worth preserving.
# Deliberately NOT filtered on `deleted_at`: this is an archival dump, not a
# report. Soft-deleted rows are exported WITH their `deleted_at` column, so the
# CSV is a faithful copy — filtering here would make the backup the one place a
# recoverable row silently stops existing.
_TABLES = [
    ("expenses", FinanceExpense),
    ("income", FinanceIncome),
    ("transfers", FinanceTransfer),
    ("accounts", Account),
    ("categories", Category),
    ("bills", FinanceBill),
    ("loans", FinanceLoan),
    ("investments", FinanceInvestment),
    ("goals", FinancialGoal),
    ("budgets", BudgetLimit),
    ("cc_bills", CCBill),
    ("merchant_rules", MerchantRule),
    ("obligation_payments", ObligationPayment),
    ("pending_transactions", FinancePendingTransaction),
    ("snapshots", FinanceSnapshot),
]


def _write_csv(path: Path, columns: list[str], rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=columns)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


async def _backup_base(user_id: uuid.UUID) -> Path:
    settings = get_settings()
    stamp = date.today().strftime("%Y-%m-%d")
    if settings.vault_sync_enabled and await is_vault_owner(user_id):
        return Path(settings.vault_path) / "01-finance" / "backups" / stamp
    return Path(settings.vault_path) / "backups" / str(user_id) / stamp


async def run_finance_backup(user_id: uuid.UUID) -> dict:
    """Export all finance tables for one user to dated CSV files. Returns per-table row counts."""
    base = await _backup_base(user_id)
    base.mkdir(parents=True, exist_ok=True)
    counts: dict[str, int] = {}

    async with AsyncSessionLocal() as session:
        for name, model in _TABLES:
            try:
                rows = (
                    await session.execute(select(model).where(model.user_id == user_id))
                ).scalars().all()
                columns = [c.name for c in model.__table__.columns]
                dicts = [
                    {c: getattr(r, c) for c in columns}
                    for r in rows
                ]
                await asyncio.to_thread(_write_csv, base / f"{name}.csv", columns, dicts)
                counts[name] = len(dicts)
            except Exception as e:  # best-effort per table
                logger.warning("Backup of %s failed for %s: %s", name, user_id, e)

    logger.info("Finance backup for %s → %s: %s", user_id, base, counts)
    return {"path": str(base), "counts": counts}
