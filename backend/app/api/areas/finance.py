import asyncio
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, AfterValidator, Field
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit, Account, Category, AccountType, FinancialGoal, FinanceBill, FinanceIncome, FinanceInvestment, FinanceLoan, FinanceTransfer, FinancePendingTransaction, FinanceSettings, GoalContribution, InvestmentTransaction, InvestmentValuation, ObligationPayment
from app.services.finance.xirr import portfolio_xirr
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/areas/finance", tags=["finance"])

# Strong refs to fire-and-forget budget-alert tasks. A bare `asyncio.create_task`
# keeps only a weak reference, so the loop may collect the task mid-flight (the
# alert silently never fires) and any exception inside it is never retrieved.
# Same pattern as `api/knowledge.py`'s manual sync.
_background_tasks: set = set()


def _spawn_budget_alert(user_id: uuid.UUID, category: str) -> None:
    from app.services.finance.budget_alerts import check_budget_alerts

    task = asyncio.create_task(check_budget_alerts(user_id, category))
    _background_tasks.add(task)
    task.add_done_callback(lambda t: (
        _background_tasks.discard(t),
        not t.cancelled() and t.exception() and logger.error(
            "Budget alert task failed: %s", t.exception()),
    ))

from app.api.finance_pending import router as finance_pending_router
router.include_router(finance_pending_router, prefix="/pending", tags=["finance-pending"])

from app.api.finance_payables import router as finance_payables_router
router.include_router(finance_payables_router, tags=["finance-payables"])

from app.api.finance_rules import router as finance_rules_router
router.include_router(finance_rules_router, tags=["finance-rules"])


def _to_naive_utc(v: Optional[datetime]) -> Optional[datetime]:
    """Normalize an incoming datetime to naive UTC. The `logged_at` columns are
    TIMESTAMP WITHOUT TIME ZONE, so a tz-aware value (e.g. the frontend's
    `dayjs(date).toISOString()` ending in 'Z') would otherwise raise an asyncpg
    DataError on insert."""
    if v is not None and v.tzinfo is not None:
        return v.astimezone(timezone.utc).replace(tzinfo=None)
    return v


# A datetime that is always stored tz-naive (UTC) to match the DB column type.
NaiveDateTime = Annotated[Optional[datetime], AfterValidator(_to_naive_utc)]


async def _adjust_balance(db, account_id: Optional[uuid.UUID], delta: float, user_id: uuid.UUID) -> None:
    """Apply a signed delta to an account balance. No-op if account_id is None."""
    if account_id is None:
        return
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id).with_for_update()
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.balance = account.balance + Decimal(str(delta))
    db.add(account)


def _month_range(month: Optional[str]) -> tuple[datetime, datetime]:
    """Parse YYYY-MM into [start, end) datetimes; defaults to current month."""
    if month:
        try:
            start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if start.month == 12:
        end = start.replace(year=start.year + 1, month=1, day=1)
    else:
        end = start.replace(month=start.month + 1, day=1)
    return start, end


@router.get("/net-worth")
async def net_worth(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Live net worth computed from accounts + investments − active loans.

    Account balances are signed by the double-entry layer (credit card debt is
    negative), so a plain sum is correct for the accounts component.
    """
    accounts = (await db.execute(select(Account).where(Account.user_id == current_user.id))).scalars().all()
    investments = (await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id))).scalars().all()
    loans = (await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id, FinanceLoan.is_active == True))).scalars().all()

    accounts_total = sum(float(a.balance) for a in accounts)
    investments_total = sum(float(i.current_value) for i in investments)
    loans_outstanding = sum(float(l.outstanding_amount) for l in loans)

    return {
        "net_worth": accounts_total + investments_total - loans_outstanding,
        "accounts_total": accounts_total,
        "investments_total": investments_total,
        "loans_outstanding": loans_outstanding,
    }


@router.get("/settings")
async def get_finance_settings(current_user=Depends(get_current_user), db=Depends(get_db)):
    row = (await db.execute(
        select(FinanceSettings).where(FinanceSettings.user_id == current_user.id)
    )).scalar_one_or_none()
    return {"auto_commit_hours": row.auto_commit_hours if row else None}


class FinanceSettingsPatch(BaseModel):
    # None = auto-commit off (review required). 1–168h when enabled.
    auto_commit_hours: Optional[int] = Field(default=None, ge=1, le=168)


@router.patch("/settings")
async def patch_finance_settings(
    body: FinanceSettingsPatch, current_user=Depends(get_current_user), db=Depends(get_db)
):
    row = (await db.execute(
        select(FinanceSettings).where(FinanceSettings.user_id == current_user.id)
    )).scalar_one_or_none()
    if not row:
        row = FinanceSettings(user_id=current_user.id)

    if "auto_commit_hours" in body.model_fields_set:
        row.auto_commit_hours = body.auto_commit_hours
        row.updated_at = datetime.utcnow()
        db.add(row)
        # Re-clock the existing review queue to match the new setting: enabling
        # starts the timer from now; disabling stops it entirely.
        pending = (await db.execute(
            select(FinancePendingTransaction).where(
                FinancePendingTransaction.user_id == current_user.id,
                FinancePendingTransaction.status == "pending",
            )
        )).scalars().all()
        new_commit_at = (
            datetime.utcnow() + timedelta(hours=body.auto_commit_hours)
            if body.auto_commit_hours else None
        )
        for p in pending:
            p.auto_commit_at = new_commit_at
            db.add(p)
        await db.commit()

    return {"auto_commit_hours": row.auto_commit_hours}


class ImportItem(BaseModel):
    logged_at: datetime
    amount: float
    kind: str  # "expense" | "income"
    category: Optional[str] = None
    description: Optional[str] = None


class ImportCheckBody(BaseModel):
    items: list[ImportItem]


def _import_key(logged_at: datetime, amount: float, description: Optional[str]) -> tuple:
    return (logged_at.date(), round(float(amount), 2), (description or "").strip().lower())


async def _existing_import_keys(db, items: list[ImportItem], user_id: uuid.UUID) -> set:
    """Keys of existing expenses/income within the items' date range."""
    if not items:
        return set()
    lo = min(i.logged_at for i in items).replace(hour=0, minute=0, second=0, microsecond=0)
    hi = max(i.logged_at for i in items) + timedelta(days=1)

    keys = set()
    expenses = (await db.execute(
        select(FinanceExpense).where(FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= lo, FinanceExpense.logged_at < hi)
    )).scalars().all()
    for e in expenses:
        keys.add(("expense",) + _import_key(e.logged_at, float(e.amount), e.description))
    income = (await db.execute(
        select(FinanceIncome).where(FinanceIncome.user_id == user_id, FinanceIncome.logged_at >= lo, FinanceIncome.logged_at < hi)
    )).scalars().all()
    for i in income:
        keys.add(("income",) + _import_key(i.logged_at, float(i.amount), i.description))
    return keys


@router.post("/import/check")
async def import_check(body: ImportCheckBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Flag which rows already exist (same kind + date + amount + description)."""
    existing = await _existing_import_keys(db, body.items, current_user.id)
    return {
        "duplicates": [
            idx for idx, item in enumerate(body.items)
            if (item.kind,) + _import_key(item.logged_at, item.amount, item.description) in existing
        ]
    }


class ImportCommitBody(BaseModel):
    account_id: Optional[uuid.UUID] = None
    items: list[ImportItem]


@router.post("/import/commit")
async def import_commit(body: ImportCommitBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Bulk-insert statement rows. Historical backfill — account balances are NOT adjusted.

    Duplicates (vs existing rows) are skipped server-side as a final guard.
    """
    if body.account_id is not None:
        owned = await db.execute(
            select(Account.id).where(Account.id == body.account_id, Account.user_id == current_user.id)
        )
        if owned.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Account not found")

    existing = await _existing_import_keys(db, body.items, current_user.id)
    imported_expenses = 0
    imported_income = 0
    skipped = 0

    for item in body.items:
        if item.amount <= 0 or item.kind not in ("expense", "income"):
            skipped += 1
            continue
        if (item.kind,) + _import_key(item.logged_at, item.amount, item.description) in existing:
            skipped += 1
            continue
        if item.kind == "expense":
            db.add(FinanceExpense(
                user_id=current_user.id,
                logged_at=item.logged_at, amount=item.amount,
                category=item.category or "Uncategorized",
                description=item.description, account_id=body.account_id,
                source="import",
            ))
            imported_expenses += 1
        else:
            db.add(FinanceIncome(
                user_id=current_user.id,
                logged_at=item.logged_at, amount=item.amount,
                source=item.category or "other",
                description=item.description, account_id=body.account_id,
            ))
            imported_income += 1

    await db.commit()
    return {"imported_expenses": imported_expenses, "imported_income": imported_income, "skipped": skipped}


@router.get("/snapshots")
async def list_snapshots(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceSnapshot).where(FinanceSnapshot.user_id == current_user.id).order_by(desc(FinanceSnapshot.snapshot_month)))
    return result.scalars().all()


@router.get("/transactions/search")
async def search_transactions(
    q: Optional[str] = None,
    kind: Optional[str] = None,  # expense | income | transfer | None=all
    account_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    tag: Optional[str] = None,
    # Origin marker, e.g. "upi-tracker" / "upi-tracker-auto". Deliberately NOT
    # folded into `tag`: that filter is the user's own freeform labels. The two
    # ledger tables record origin in different columns — FinanceExpense.source
    # is a real column, while FinanceIncome.source holds the CATEGORY name, so
    # income's origin lives in its tags. This param hides that asymmetry.
    source: Optional[str] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    date_from: Optional[str] = None,  # YYYY-MM-DD
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Unified search across expenses, income and transfers — all months."""
    from sqlalchemy import or_

    limit = min(limit, 200)
    like = f"%{q}%" if q else None
    tag_like = f"%{tag}%" if tag else None
    source_like = f"%{source}%" if source else None

    def parse_date(s: Optional[str]) -> Optional[datetime]:
        if not s:
            return None
        try:
            return datetime.strptime(s, "%Y-%m-%d")
        except ValueError:
            return None

    d_from = parse_date(date_from)
    d_to = parse_date(date_to)
    if d_to:
        d_to = d_to + timedelta(days=1)  # inclusive end date

    def apply_common(query, model):
        query = query.where(model.user_id == current_user.id)
        if min_amount is not None:
            query = query.where(model.amount >= min_amount)
        if max_amount is not None:
            query = query.where(model.amount <= max_amount)
        if d_from:
            query = query.where(model.logged_at >= d_from)
        if d_to:
            query = query.where(model.logged_at < d_to)
        return query

    # Category filter only applies to expenses; income/transfers have no category.
    include_expense = kind in (None, "expense")
    include_income = kind in (None, "income") and not category
    # Transfers carry neither a category, a tag nor an origin marker.
    include_transfer = kind in (None, "transfer") and not category and not tag and not source

    # Build UNION ALL via SQLAlchemy text() — all WHERE values are bound params
    # so there is zero SQL injection risk despite the dynamic query assembly.
    from sqlalchemy import text as sa_text

    parts: list[str] = []
    params: dict = {"uid": str(current_user.id), "lim": limit, "off": offset}
    p = 0  # param counter for uniqueness

    def _common_clauses(col_prefix: str, table_alias: str) -> str:
        nonlocal p
        # The cast is required: :uid is bound as a Python str and asyncpg sends
        # it as VARCHAR, which Postgres will not compare to a uuid column
        # ("operator does not exist: uuid = character varying").
        # It must be CAST(:uid AS uuid), NOT :uid::uuid — text()'s bind-param
        # regex requires the character after a name to not be ':', so the
        # postfix form makes SQLAlchemy stop seeing `uid` as a parameter at all.
        clauses = [f"{table_alias}.user_id = CAST(:uid AS uuid)"]
        if min_amount is not None:
            params[f"min_a{p}"] = min_amount
            clauses.append(f"{table_alias}.amount >= :min_a{p}"); p += 1
        if max_amount is not None:
            params[f"max_a{p}"] = max_amount
            clauses.append(f"{table_alias}.amount <= :max_a{p}"); p += 1
        if d_from:
            params[f"dfrom{p}"] = d_from
            clauses.append(f"{table_alias}.logged_at >= :dfrom{p}"); p += 1
        if d_to:
            params[f"dto{p}"] = d_to
            clauses.append(f"{table_alias}.logged_at < :dto{p}"); p += 1
        return " AND ".join(clauses)

    if include_expense:
        w = _common_clauses("amount", "e")
        if like:
            params[f"ql{p}"] = like
            w += f" AND (e.description ILIKE :ql{p} OR e.category ILIKE :ql{p} OR e.tags ILIKE :ql{p})"; p += 1
        if tag_like:
            params[f"tl{p}"] = tag_like
            w += f" AND e.tags ILIKE :tl{p}"; p += 1
        if source_like:
            params[f"sl{p}"] = source_like
            w += f" AND e.source ILIKE :sl{p}"; p += 1
        if account_id:
            params[f"aid{p}"] = str(account_id)
            w += f" AND e.account_id = CAST(:aid{p} AS uuid)"; p += 1
        if category:
            params[f"cat{p}"] = category
            w += f" AND e.category = :cat{p}"; p += 1
        parts.append(
            f"SELECT id::text, 'expense' AS kind, logged_at, amount::float8, "
            f"category, description, account_id::text, tags, split_group_id::text "
            f"FROM finance_expenses e WHERE {w}"
        )

    if include_income:
        w = _common_clauses("amount", "i")
        if like:
            params[f"ql{p}"] = like
            w += f" AND (i.description ILIKE :ql{p} OR i.source ILIKE :ql{p} OR i.tags ILIKE :ql{p})"; p += 1
        if tag_like:
            params[f"tl{p}"] = tag_like
            w += f" AND i.tags ILIKE :tl{p}"; p += 1
        if source_like:
            # Income's `source` column is the category name, so its origin
            # marker is written to tags instead (see commit_pending_to_ledger).
            params[f"sl{p}"] = source_like
            w += f" AND i.tags ILIKE :sl{p}"; p += 1
        if account_id:
            params[f"aid{p}"] = str(account_id)
            w += f" AND i.account_id = CAST(:aid{p} AS uuid)"; p += 1
        parts.append(
            f"SELECT id::text, 'income' AS kind, logged_at, amount::float8, "
            f"source AS category, description, account_id::text, tags, NULL::text AS split_group_id "
            f"FROM finance_income i WHERE {w}"
        )

    if include_transfer:
        w = _common_clauses("amount", "t")
        if like:
            params[f"ql{p}"] = like
            w += f" AND t.description ILIKE :ql{p}"; p += 1
        if account_id:
            params[f"aid{p}"] = str(account_id)
            w += f" AND (t.from_account_id = CAST(:aid{p} AS uuid) OR t.to_account_id = CAST(:aid{p} AS uuid))"; p += 1
        parts.append(
            f"SELECT id::text, 'transfer' AS kind, logged_at, amount::float8, "
            f"'Transfer' AS category, description, from_account_id::text AS account_id, "
            f"NULL::text AS tags, NULL::text AS split_group_id "
            f"FROM finance_transfers t WHERE {w}"
        )

    if not parts:
        return {"items": [], "total": 0, "has_more": False}

    union_sql = " UNION ALL ".join(parts)
    total_sql = f"SELECT COUNT(*) FROM ({union_sql}) AS _u"
    page_sql = f"{union_sql} ORDER BY logged_at DESC LIMIT :lim OFFSET :off"

    # bindparams() rejects any name the statement does not actually contain, so
    # the COUNT query — which has no LIMIT/OFFSET — must not be handed `lim`/`off`.
    # Passing them raised ArgumentError on EVERY call, i.e. search and every
    # filter on the Transactions page were a hard 500 for as long as this
    # UNION-based implementation has existed.
    count_params = {k: v for k, v in params.items() if k not in ("lim", "off")}
    total_row = (await db.execute(sa_text(total_sql).bindparams(**count_params))).scalar_one()
    rows = (await db.execute(sa_text(page_sql).bindparams(**params))).all()

    items = [
        {
            "id": r[0], "kind": r[1],
            "logged_at": r[2].isoformat() if r[2] else None,
            "amount": r[3], "category": r[4], "description": r[5],
            "account_id": r[6], "tags": r[7], "split_group_id": r[8],
        }
        for r in rows
    ]
    return {"items": items, "total": total_row, "has_more": offset + limit < total_row}


@router.get("/expenses")
async def list_expenses(
    month: Optional[str] = None,
    category: Optional[str] = None,
    time_range: Optional[str] = None,
    q: Optional[str] = None,
    account_id: Optional[uuid.UUID] = None,
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    limit = min(limit, 200)
    query = select(FinanceExpense).where(FinanceExpense.user_id == current_user.id).order_by(desc(FinanceExpense.logged_at))

    if q:
        from sqlalchemy import or_
        like = f"%{q}%"
        query = query.where(or_(FinanceExpense.description.ilike(like), FinanceExpense.category.ilike(like)))

    if account_id:
        query = query.where(FinanceExpense.account_id == account_id)

    if month:
        try:
            m_date = datetime.strptime(month, "%Y-%m")
            next_m = m_date.replace(year=m_date.year+1, month=1) if m_date.month == 12 else m_date.replace(month=m_date.month+1)
            query = query.where(FinanceExpense.logged_at >= m_date)
            query = query.where(FinanceExpense.logged_at < next_m)
        except ValueError:
            pass

    if time_range:
        now = datetime.utcnow()
        if time_range.lower() == "day":
            query = query.where(FinanceExpense.logged_at >= now.replace(hour=0, minute=0, second=0, microsecond=0))
        elif time_range.lower() == "week":
            start_of_week = now - timedelta(days=7)
            query = query.where(FinanceExpense.logged_at >= start_of_week)
        elif time_range.lower() == "month":
            query = query.where(FinanceExpense.logged_at >= now.replace(day=1, hour=0, minute=0, second=0, microsecond=0))

    if category:
        from sqlalchemy import func
        query = query.where(func.lower(FinanceExpense.category) == category.lower())
        
    from sqlalchemy import func as sa_func
    count_query = select(sa_func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()
    
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    page = result.scalars().all()
    return {"items": page, "total": total, "has_more": offset + limit < total}


class SplitPart(BaseModel):
    category: str
    amount: float


async def _resolve_category(
    db, category_id: Optional[uuid.UUID], user_id: uuid.UUID, *, strict: bool = True
) -> tuple[Optional[str], Optional[uuid.UUID]]:
    """Resolve a category node to its TOP-LEVEL ancestor name (denormalized for
    rollup) + the exact node id.

    "No category supplied" is `(None, None)` — that is a legitimate state and
    callers fall back to "Uncategorized". A category id that does NOT resolve to
    one of this user's categories is NOT: silently returning `(None, None)` made
    `update_expense` clear a correctly-set category and return 200 whenever the
    client sent a typo'd or foreign UUID, so a client bug looked like server
    data loss. `strict=False` is for the background auto-commit cron, where
    raising an HTTPException has nobody to answer it.
    """
    if category_id is None:
        return None, None
    cat = (await db.execute(select(Category).where(Category.id == category_id, Category.user_id == user_id))).scalar_one_or_none()
    if not cat:
        if strict:
            raise HTTPException(status_code=404, detail="Category not found")
        return None, None
    if cat.parent_id:
        parent = (await db.execute(select(Category).where(Category.id == cat.parent_id, Category.user_id == user_id))).scalar_one_or_none()
        return (parent.name if parent else cat.name), cat.id
    return cat.name, cat.id


class ExpenseCreate(BaseModel):
    amount: float
    category: Optional[str] = None  # legacy/import fallback; prefer category_id
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    logged_at: NaiveDateTime = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None
    splits: Optional[list[SplitPart]] = None  # legacy split support (unused by the UI)


@router.post("/expenses")
async def create_expense(body: ExpenseCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    if body.account_id is None:
        raise HTTPException(status_code=422, detail="An account is required")

    top_name, cat_id = await _resolve_category(db, body.category_id, current_user.id)
    category_name = top_name or body.category or "Uncategorized"
    logged_at = body.logged_at or datetime.utcnow()
    created = []

    if body.splits:
        if any(s.amount <= 0 for s in body.splits):
            raise HTTPException(status_code=422, detail="Split amounts must be positive")
        if abs(sum(s.amount for s in body.splits) - body.amount) > 0.01:
            raise HTTPException(status_code=422, detail="Split amounts must sum to the total")
        group_id = uuid.uuid4()
        for part in body.splits:
            created.append(FinanceExpense(
                user_id=current_user.id,
                logged_at=logged_at, amount=part.amount, category=part.category,
                description=body.description, account_id=body.account_id,
                tags=body.tags, split_group_id=group_id, source="manual",
            ))
    else:
        created.append(FinanceExpense(
            user_id=current_user.id,
            logged_at=logged_at, amount=body.amount, category=category_name, category_id=cat_id,
            description=body.description, account_id=body.account_id,
            tags=body.tags, source="manual",
        ))

    await _adjust_balance(db, body.account_id, -body.amount, current_user.id)
    for e in created:
        db.add(e)
    await db.commit()
    for e in created:
        await db.refresh(e)

    categories = {e.category for e in created if e.category}
    for cat in categories:
        _spawn_budget_alert(current_user.id, cat)
    return created[0] if len(created) == 1 else {"split_group_id": str(created[0].split_group_id), "items": created}


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    logged_at: NaiveDateTime = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.patch("/expenses/{expense_id}")
async def update_expense(expense_id: uuid.UUID, body: ExpenseUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceExpense).where(FinanceExpense.id == expense_id, FinanceExpense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    # Revert old balance effect, apply new one
    await _adjust_balance(db, expense.account_id, float(expense.amount), current_user.id)
    if body.amount is not None:
        expense.amount = body.amount
    if "category_id" in body.model_fields_set:
        top_name, cat_id = await _resolve_category(db, body.category_id, current_user.id)
        expense.category_id = cat_id
        expense.category = top_name or "Uncategorized"
    elif body.category is not None:
        expense.category = body.category
    if body.description is not None:
        expense.description = body.description
    if body.logged_at is not None:
        expense.logged_at = body.logged_at
    if "tags" in body.model_fields_set:
        expense.tags = body.tags
    if "account_id" in body.model_fields_set:
        expense.account_id = body.account_id
    await _adjust_balance(db, expense.account_id, -float(expense.amount), current_user.id)

    db.add(expense)
    await db.commit()
    await db.refresh(expense)
    if expense.category:
        _spawn_budget_alert(current_user.id, expense.category)
    return expense


@router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceExpense).where(FinanceExpense.id == expense_id, FinanceExpense.user_id == current_user.id))
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await _adjust_balance(db, expense.account_id, float(expense.amount), current_user.id)
    await db.delete(expense)
    await db.commit()
    return {"status": "deleted"}


# ── Financial Goals ────────────────────────────────────────────

@router.get("/goals")
async def list_goals(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.user_id == current_user.id).order_by(FinancialGoal.created_at))
    return result.scalars().all()


class GoalCreate(BaseModel):
    name: str
    icon: str = "🎯"
    target_amount: float
    current_amount: float = 0
    deadline: Optional[str] = None  # ISO date string YYYY-MM-DD
    category: str = "general"
    color: str = "#0D9488"


@router.post("/goals")
async def create_goal(body: GoalCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    from datetime import date as date_type
    deadline = date_type.fromisoformat(body.deadline) if body.deadline else None
    goal = FinancialGoal(
        user_id=current_user.id,
        name=body.name,
        icon=body.icon,
        target_amount=body.target_amount,
        current_amount=body.current_amount,
        deadline=deadline,
        category=body.category,
        color=body.color,
    )
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[str] = None
    color: Optional[str] = None


@router.patch("/goals/{goal_id}")
async def update_goal(goal_id: uuid.UUID, body: GoalUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    from datetime import date as date_type
    if body.name is not None:
        goal.name = body.name
    if body.icon is not None:
        goal.icon = body.icon
    if body.target_amount is not None:
        goal.target_amount = body.target_amount
    if body.current_amount is not None:
        goal.current_amount = body.current_amount
    if "deadline" in body.model_fields_set:
        goal.deadline = date_type.fromisoformat(body.deadline) if body.deadline is not None else None
    if body.color is not None:
        goal.color = body.color
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinancialGoal).where(FinancialGoal.id == goal_id, FinancialGoal.user_id == current_user.id))
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
    return {"status": "deleted"}


# ── Goal contributions ───────────────────────────────
# `FinancialGoal.current_amount` is a running total, so "contributed per month"
# — which the canvas draws per goal — is not recoverable from it. These rows
# are the ledger behind that total; writing one moves the total too, so the
# two can never disagree.

async def _owned_goal(db, goal_id: uuid.UUID, user_id: uuid.UUID) -> FinancialGoal:
    result = await db.execute(
        select(FinancialGoal).where(
            FinancialGoal.id == goal_id, FinancialGoal.user_id == user_id
        )
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.get("/goals/contributions/monthly")
async def goal_contributions_monthly(
    months: int = 6, current_user=Depends(get_current_user), db=Depends(get_db)
):
    """Per-goal contribution totals bucketed by month, newest bucket last.

    Drives the canvas's "monthly contributions" bars. Months with no
    contribution are emitted as zero rather than skipped — a gap in a bar chart
    reads as missing data, but a zero month is a real fact about the goal.
    """
    months = max(1, min(24, months))
    now = datetime.utcnow()

    # Walk back N calendar months from this one. Day arithmetic would drift
    # across months of different lengths; (year, month) arithmetic cannot.
    buckets: list[str] = []
    year, month = now.year, now.month
    for _ in range(months):
        buckets.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    buckets.reverse()

    start = datetime(int(buckets[0][:4]), int(buckets[0][5:]), 1)

    goals = (await db.execute(
        select(FinancialGoal).where(FinancialGoal.user_id == current_user.id)
    )).scalars().all()

    rows = (await db.execute(
        select(GoalContribution).where(
            GoalContribution.user_id == current_user.id,
            GoalContribution.contributed_at >= start,
        )
    )).scalars().all()

    by_goal: dict[uuid.UUID, dict[str, float]] = {}
    for row in rows:
        label = row.contributed_at.strftime("%Y-%m")
        bucket = by_goal.setdefault(row.goal_id, {})
        bucket[label] = bucket.get(label, 0.0) + float(row.amount)

    return {
        "months": buckets,
        "goals": [
            {
                "goal_id": str(g.id),
                "name": g.name,
                "color": g.color,
                "series": [round(by_goal.get(g.id, {}).get(m, 0.0), 2) for m in buckets],
            }
            for g in goals
        ],
    }


@router.get("/goals/{goal_id}/contributions")
async def list_goal_contributions(
    goal_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)
):
    await _owned_goal(db, goal_id, current_user.id)
    result = await db.execute(
        select(GoalContribution)
        .where(
            GoalContribution.goal_id == goal_id,
            GoalContribution.user_id == current_user.id,
        )
        .order_by(desc(GoalContribution.contributed_at))
    )
    return result.scalars().all()


class GoalContributionCreate(BaseModel):
    # Deliberately not `gt=0`: a withdrawal from a goal is a real event and the
    # series has to be able to go down.
    amount: float
    contributed_at: NaiveDateTime = None
    note: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/goals/{goal_id}/contributions")
async def create_goal_contribution(
    goal_id: uuid.UUID,
    body: GoalContributionCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if body.amount == 0:
        raise HTTPException(status_code=422, detail="amount must be non-zero")
    goal = await _owned_goal(db, goal_id, current_user.id)

    row = GoalContribution(
        user_id=current_user.id,
        goal_id=goal_id,
        amount=Decimal(str(body.amount)),
        contributed_at=body.contributed_at or datetime.utcnow(),
        note=body.note,
        account_id=body.account_id,
    )
    db.add(row)

    # Keep the running total in step, and move the money out of the funding
    # account when one is named — otherwise saving toward a goal would create
    # value out of nothing.
    goal.current_amount = (goal.current_amount or Decimal("0")) + Decimal(str(body.amount))
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    if body.account_id is not None:
        await _adjust_balance(db, body.account_id, -body.amount, current_user.id)

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/goals/{goal_id}/contributions/{contribution_id}")
async def delete_goal_contribution(
    goal_id: uuid.UUID,
    contribution_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    goal = await _owned_goal(db, goal_id, current_user.id)
    result = await db.execute(
        select(GoalContribution).where(
            GoalContribution.id == contribution_id,
            GoalContribution.goal_id == goal_id,
            GoalContribution.user_id == current_user.id,
        )
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Contribution not found")

    goal.current_amount = (goal.current_amount or Decimal("0")) - row.amount
    goal.updated_at = datetime.utcnow()
    db.add(goal)
    if row.account_id is not None:
        await _adjust_balance(db, row.account_id, float(row.amount), current_user.id)

    await db.delete(row)
    await db.commit()
    return {"status": "deleted"}


# ── Bills ────────────────────────────────────────────

@router.get("/bills")
async def list_bills(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.user_id == current_user.id).order_by(FinanceBill.due_day))
    return result.scalars().all()


class BillCreate(BaseModel):
    name: str
    amount: float = Field(gt=0)
    due_day: int
    category: str = "utilities"
    is_auto_debit: bool = False
    is_active: bool = True
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/bills")
async def create_bill(body: BillCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    bill = FinanceBill(
        user_id=current_user.id,
        name=body.name,
        amount=body.amount,
        due_day=body.due_day,
        category=body.category,
        is_auto_debit=body.is_auto_debit,
        is_active=body.is_active,
        notes=body.notes,
        account_id=body.account_id,
    )
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


class BillUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    due_day: Optional[int] = None
    category: Optional[str] = None
    is_auto_debit: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.patch("/bills/{bill_id}")
async def update_bill(bill_id: uuid.UUID, body: BillUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id, FinanceBill.user_id == current_user.id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(bill, field, value)
    db.add(bill)
    await db.commit()
    await db.refresh(bill)
    return bill


@router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceBill).where(FinanceBill.id == bill_id, FinanceBill.user_id == current_user.id))
    bill = result.scalar_one_or_none()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    await db.delete(bill)
    await db.commit()
    return {"status": "deleted"}


# ── Income ────────────────────────────────────────────

@router.get("/income")
async def list_income(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(FinanceIncome).where(FinanceIncome.user_id == current_user.id).order_by(desc(FinanceIncome.logged_at))

    if month:
        try:
            m_date = datetime.strptime(month, "%Y-%m")
            next_m = m_date.replace(year=m_date.year+1, month=1) if m_date.month == 12 else m_date.replace(month=m_date.month+1)
            query = query.where(FinanceIncome.logged_at >= m_date)
            query = query.where(FinanceIncome.logged_at < next_m)
        except ValueError:
            pass
    else:
        query = query.limit(50)

    result = await db.execute(query)
    return result.scalars().all()


class IncomeCreate(BaseModel):
    amount: float
    source: Optional[str] = None  # legacy fallback; prefer category_id
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    logged_at: NaiveDateTime = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.post("/income")
async def create_income(body: IncomeCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    if body.account_id is None:
        raise HTTPException(status_code=422, detail="An account is required")
    top_name, cat_id = await _resolve_category(db, body.category_id, current_user.id)
    income = FinanceIncome(
        user_id=current_user.id,
        amount=body.amount,
        source=top_name or body.source or "Uncategorized",
        category_id=cat_id,
        description=body.description,
        account_id=body.account_id,
        tags=body.tags,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    await _adjust_balance(db, body.account_id, body.amount, current_user.id)
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


class IncomeUpdate(BaseModel):
    amount: Optional[float] = None
    source: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    logged_at: NaiveDateTime = None
    account_id: Optional[uuid.UUID] = None
    tags: Optional[str] = None


@router.patch("/income/{income_id}")
async def update_income(income_id: uuid.UUID, body: IncomeUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceIncome).where(FinanceIncome.id == income_id, FinanceIncome.user_id == current_user.id))
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    if body.amount is not None and body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")

    # Revert old balance effect, apply new one
    await _adjust_balance(db, income.account_id, -float(income.amount), current_user.id)
    if body.amount is not None:
        income.amount = body.amount
    if "category_id" in body.model_fields_set:
        top_name, cat_id = await _resolve_category(db, body.category_id, current_user.id)
        income.category_id = cat_id
        income.source = top_name or "Uncategorized"
    elif body.source is not None:
        income.source = body.source
    if body.description is not None:
        income.description = body.description
    if body.logged_at is not None:
        income.logged_at = body.logged_at
    if "tags" in body.model_fields_set:
        income.tags = body.tags
    if "account_id" in body.model_fields_set:
        income.account_id = body.account_id
    await _adjust_balance(db, income.account_id, float(income.amount), current_user.id)

    db.add(income)
    await db.commit()
    await db.refresh(income)
    return income


@router.delete("/income/{income_id}")
async def delete_income(income_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceIncome).where(FinanceIncome.id == income_id, FinanceIncome.user_id == current_user.id))
    income = result.scalar_one_or_none()
    if not income:
        raise HTTPException(status_code=404, detail="Income not found")
    await _adjust_balance(db, income.account_id, -float(income.amount), current_user.id)
    await db.delete(income)
    await db.commit()
    return {"status": "deleted"}


# ── Transfers ────────────────────────────────────────────

@router.get("/transfers")
async def list_transfers(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(FinanceTransfer).where(FinanceTransfer.user_id == current_user.id).order_by(desc(FinanceTransfer.logged_at))
    if month:
        start, end = _month_range(month)
        query = query.where(FinanceTransfer.logged_at >= start).where(FinanceTransfer.logged_at < end)
    else:
        query = query.limit(50)
    result = await db.execute(query)
    return result.scalars().all()


class TransferCreate(BaseModel):
    amount: float
    from_account_id: uuid.UUID
    to_account_id: uuid.UUID
    description: Optional[str] = None
    logged_at: NaiveDateTime = None


@router.post("/transfers")
async def create_transfer(body: TransferCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.amount <= 0:
        raise HTTPException(status_code=422, detail="Amount must be positive")
    if body.from_account_id == body.to_account_id:
        raise HTTPException(status_code=422, detail="From and to accounts must differ")
    transfer = FinanceTransfer(
        user_id=current_user.id,
        amount=body.amount,
        from_account_id=body.from_account_id,
        to_account_id=body.to_account_id,
        description=body.description,
        logged_at=body.logged_at or datetime.utcnow(),
    )
    await _adjust_balance(db, body.from_account_id, -body.amount, current_user.id)
    await _adjust_balance(db, body.to_account_id, body.amount, current_user.id)
    db.add(transfer)
    await db.commit()
    await db.refresh(transfer)
    return transfer


@router.delete("/transfers/{transfer_id}")
async def delete_transfer(transfer_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceTransfer).where(FinanceTransfer.id == transfer_id, FinanceTransfer.user_id == current_user.id))
    transfer = result.scalar_one_or_none()
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    await _adjust_balance(db, transfer.from_account_id, float(transfer.amount), current_user.id)
    await _adjust_balance(db, transfer.to_account_id, -float(transfer.amount), current_user.id)
    await db.delete(transfer)
    await db.commit()
    return {"status": "deleted"}


# ── Cashflow ────────────────────────────────────────────

@router.get("/cashflow")
async def cashflow(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func
    from datetime import date as date_type
    if month:
        try:
            month_start = datetime.strptime(month, "%Y-%m")
        except ValueError:
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if month_start.month == 12:
        month_end = month_start.replace(year=month_start.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        month_end = month_start.replace(month=month_start.month + 1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # totals
    income_result = await db.execute(
        select(func.coalesce(func.sum(FinanceIncome.amount), 0))
        .where(FinanceIncome.user_id == current_user.id)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    income_total = float(income_result.scalar_one())

    expense_result = await db.execute(
        select(func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < month_end)
    )
    expense_total = float(expense_result.scalar_one())

    savings_rate = round((income_total - expense_total) / income_total * 100, 2) if income_total > 0 else 0.0

    # by day — merge income and expense rows
    income_rows = await db.execute(
        select(FinanceIncome.logged_at, FinanceIncome.amount)
        .where(FinanceIncome.user_id == current_user.id)
        .where(FinanceIncome.logged_at >= month_start)
        .where(FinanceIncome.logged_at < month_end)
    )
    expense_rows = await db.execute(
        select(FinanceExpense.logged_at, FinanceExpense.amount)
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= month_start)
        .where(FinanceExpense.logged_at < month_end)
    )

    day_income: dict[str, float] = {}
    for logged_at, amount in income_rows.all():
        d = logged_at.date().isoformat()
        day_income[d] = day_income.get(d, 0.0) + float(amount)

    day_expense: dict[str, float] = {}
    for logged_at, amount in expense_rows.all():
        d = logged_at.date().isoformat()
        day_expense[d] = day_expense.get(d, 0.0) + float(amount)

    all_days = sorted(set(day_income) | set(day_expense))
    by_day = [
        {"date": d, "income": day_income.get(d, 0.0), "expense": day_expense.get(d, 0.0)}
        for d in all_days
    ]

    return {
        "month": month_start.strftime("%Y-%m"),
        "income_total": income_total,
        "expense_total": expense_total,
        "savings_rate": savings_rate,
        "by_day": by_day,
    }


# ── Budget Limits ────────────────────────────────────────────

@router.get("/budgets")
async def list_budgets(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.user_id == current_user.id))
    return result.scalars().all()


@router.get("/budgets/status")
async def budget_status(month: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Per-category budget limit vs actual spend for a month — Money Manager budget graph data."""
    from sqlalchemy import func
    start, end = _month_range(month)

    budgets_result = await db.execute(select(BudgetLimit).where(BudgetLimit.user_id == current_user.id))
    budgets = budgets_result.scalars().all()

    spent_result = await db.execute(
        select(FinanceExpense.category, func.coalesce(func.sum(FinanceExpense.amount), 0))
        .where(FinanceExpense.user_id == current_user.id)
        .where(FinanceExpense.logged_at >= start)
        .where(FinanceExpense.logged_at < end)
        .group_by(FinanceExpense.category)
    )
    spent_by_category = {cat: float(total) for cat, total in spent_result.all() if cat}

    items = []
    for b in budgets:
        spent = spent_by_category.get(b.category, 0.0)
        limit = float(b.monthly_limit)
        items.append({
            "category": b.category,
            "monthly_limit": limit,
            "spent": spent,
            "remaining": limit - spent,
            "pct": round(spent / limit * 100, 1) if limit > 0 else 0.0,
        })
    items.sort(key=lambda x: x["pct"], reverse=True)
    return {"month": start.strftime("%Y-%m"), "items": items}


class BudgetUpsert(BaseModel):
    category: str
    monthly_limit: float = Field(gt=0)


@router.put("/budgets")
async def upsert_budget(body: BudgetUpsert, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Create or replace budget limit for a category."""
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == body.category, BudgetLimit.user_id == current_user.id))
    budget = result.scalar_one_or_none()
    if budget:
        budget.monthly_limit = body.monthly_limit
        budget.updated_at = datetime.utcnow()
    else:
        budget = BudgetLimit(user_id=current_user.id, category=body.category, monthly_limit=body.monthly_limit)
    db.add(budget)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/budgets/{category}")
async def delete_budget(category: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BudgetLimit).where(BudgetLimit.category == category, BudgetLimit.user_id == current_user.id))
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")
    await db.delete(budget)
    await db.commit()
    return {"status": "deleted"}

# ── Accounts ────────────────────────────────────────────

@router.get("/accounts")
async def list_accounts(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).where(Account.user_id == current_user.id).order_by(Account.name))
    return result.scalars().all()

class AccountCreate(BaseModel):
    name: str
    type: AccountType
    balance: float = 0
    currency: str = "INR"
    # Only meaningful on a credit card. Left NULL, utilization is reported as
    # unknown rather than as 0% of nothing.
    credit_limit: Optional[float] = Field(default=None, gt=0)

@router.post("/accounts")
async def create_account(body: AccountCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    account = Account(
        user_id=current_user.id,
        name=body.name,
        type=body.type,
        balance=body.balance,
        currency=body.currency,
        credit_limit=body.credit_limit,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account

@router.get("/accounts/{account_id}/ledger")
async def account_ledger(account_id: uuid.UUID, limit: int = 50, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Unified recent transaction history for one account: expenses, income, transfers."""
    limit = min(limit, 200)

    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    expenses = (await db.execute(
        select(FinanceExpense).where(FinanceExpense.account_id == account_id, FinanceExpense.user_id == current_user.id)
        .order_by(desc(FinanceExpense.logged_at)).limit(limit)
    )).scalars().all()
    income = (await db.execute(
        select(FinanceIncome).where(FinanceIncome.account_id == account_id, FinanceIncome.user_id == current_user.id)
        .order_by(desc(FinanceIncome.logged_at)).limit(limit)
    )).scalars().all()
    transfers = (await db.execute(
        select(FinanceTransfer)
        .where((FinanceTransfer.from_account_id == account_id) | (FinanceTransfer.to_account_id == account_id))
        .where(FinanceTransfer.user_id == current_user.id)
        .order_by(desc(FinanceTransfer.logged_at)).limit(limit)
    )).scalars().all()

    entries = []
    for e in expenses:
        entries.append({
            "id": str(e.id), "kind": "expense",
            "amount": -float(e.amount),
            "label": e.description or e.category or "Expense",
            "description": e.description,
            "category": e.category,
            "category_id": str(e.category_id) if e.category_id else None,
            "account_id": str(e.account_id) if e.account_id else None,
            "logged_at": e.logged_at.isoformat(),
        })
    for i in income:
        entries.append({
            "id": str(i.id), "kind": "income",
            "amount": float(i.amount),
            "label": i.description or i.source,
            "description": i.description,
            "category": i.source,
            "category_id": str(i.category_id) if i.category_id else None,
            "account_id": str(i.account_id) if i.account_id else None,
            "logged_at": i.logged_at.isoformat(),
        })
    for t in transfers:
        outgoing = t.from_account_id == account_id
        entries.append({
            "id": str(t.id), "kind": "transfer",
            "amount": -float(t.amount) if outgoing else float(t.amount),
            "label": t.description or ("Transfer out" if outgoing else "Transfer in"),
            "description": t.description,
            "category": "Transfer",
            "category_id": None,
            "account_id": str(account_id),
            "logged_at": t.logged_at.isoformat(),
        })

    entries.sort(key=lambda x: x["logged_at"], reverse=True)
    return {"account": account, "entries": entries[:limit]}


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[AccountType] = None
    currency: Optional[str] = None
    credit_limit: Optional[float] = None


@router.patch("/accounts/{account_id}")
async def update_account(
    account_id: uuid.UUID,
    body: AccountUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    updates = body.model_dump(exclude_unset=True)
    if "name" in updates:
        name = (updates["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        account.name = name
    if "type" in updates and updates["type"] is not None:
        account.type = updates["type"]
    if "currency" in updates:
        currency = (updates["currency"] or "").strip().upper()
        if not currency:
            raise HTTPException(status_code=400, detail="Currency cannot be empty")
        account.currency = currency
    # Presence-checked, not truthiness-checked: an explicit null is how the UI
    # clears a limit, and 0 is not a valid limit anyway.
    if "credit_limit" in updates:
        limit = updates["credit_limit"]
        if limit is not None and limit <= 0:
            raise HTTPException(status_code=422, detail="credit_limit must be positive")
        account.credit_limit = Decimal(str(limit)) if limit is not None else None

    await db.commit()
    await db.refresh(account)
    return account


@router.delete("/accounts/{account_id}")
async def delete_account(account_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Account).where(Account.id == account_id, Account.user_id == current_user.id))
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Every other child row detaches via ON DELETE SET NULL (migration
    # f002_account_fk_ondelete). Transfers cannot: both sides are NOT NULL and a
    # transfer with one end missing is meaningless, so the constraint is
    # RESTRICT and this is the message the user gets instead of a 500.
    from sqlalchemy import func as sa_func, or_ as sa_or
    transfer_count = (await db.execute(
        select(sa_func.count()).select_from(FinanceTransfer).where(
            FinanceTransfer.user_id == current_user.id,
            sa_or(
                FinanceTransfer.from_account_id == account_id,
                FinanceTransfer.to_account_id == account_id,
            ),
        )
    )).scalar_one()
    if transfer_count:
        raise HTTPException(
            status_code=409,
            detail=(
                f"This account is used by {transfer_count} transfer"
                f"{'s' if transfer_count != 1 else ''}. Delete or re-point them first — "
                "a transfer cannot exist with one side missing."
            ),
        )

    await db.delete(account)
    await db.commit()
    return {"status": "deleted"}

# ── Categories ────────────────────────────────────────────

# Default category trees seeded once per user (income + expense kept separate).
# (name, icon, [subcategory names]). Two levels only.
_DEFAULT_CATEGORIES: dict[str, list[tuple[str, str, list[str]]]] = {
    "expense": [
        ("Food", "🍔", ["Groceries", "Eating out", "Coffee & snacks"]),
        ("Transport", "🚗", ["Fuel", "Cab", "Public transit", "Parking"]),
        ("Bills & Utilities", "💡", ["Electricity", "Water", "Internet", "Mobile", "Gas"]),
        ("Housing", "🏠", ["Rent", "Maintenance"]),
        ("Shopping", "🛍️", ["Clothing", "Electronics", "Home"]),
        ("Health", "🩺", ["Medicines", "Doctor", "Fitness", "Insurance"]),
        ("Entertainment", "🎬", ["Subscriptions", "Movies", "Games"]),
        ("Education", "🎓", ["Courses", "Books"]),
        ("Personal Care", "🧴", ["Grooming", "Gifts"]),
        ("Others", "📦", []),
    ],
    "income": [
        ("Salary", "💼", ["Base pay", "Bonus"]),
        ("Freelance", "🧑‍💻", []),
        ("Business", "🏢", []),
        ("Investments", "📈", ["Dividends", "Interest", "Capital gains"]),
        ("Rental", "🏘️", []),
        ("Gifts", "🎁", []),
        ("Refunds", "↩️", []),
        ("Other", "📦", []),
    ],
}


async def _seed_categories_for_kind(db, user_id: uuid.UUID, kind: str) -> None:
    """Seed the default tree for one kind (income/expense)."""
    for name, icon, subs in _DEFAULT_CATEGORIES.get(kind, []):
        parent = Category(user_id=user_id, name=name, kind=kind, icon=icon)
        db.add(parent)
        await db.flush()
        for sub in subs:
            db.add(Category(user_id=user_id, name=sub, kind=kind, parent_id=parent.id))


@router.get("/categories")
async def list_categories(kind: Optional[str] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    cats = (await db.execute(select(Category).where(Category.user_id == current_user.id))).scalars().all()
    # Seed whichever tree is empty (handles existing users who only have one kind).
    seeded = False
    for k in ("expense", "income"):
        if not any((c.kind or "expense") == k for c in cats):
            await _seed_categories_for_kind(db, current_user.id, k)
            seeded = True
    if seeded:
        await db.commit()
        cats = (await db.execute(select(Category).where(Category.user_id == current_user.id))).scalars().all()
    if kind in ("expense", "income"):
        cats = [c for c in cats if (c.kind or "expense") == kind]
    return sorted(cats, key=lambda c: c.name.lower())


def _dup_category(cats: list, name: str, kind: str, parent_id, exclude_id=None) -> bool:
    n = name.strip().lower()
    return any(
        c.id != exclude_id and c.name.lower() == n and (c.kind or "expense") == kind and c.parent_id == parent_id
        for c in cats
    )


class CategoryCreate(BaseModel):
    name: str
    kind: str = "expense"
    parent_id: Optional[uuid.UUID] = None
    icon: Optional[str] = None


@router.post("/categories")
async def create_category(body: CategoryCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Category name is required")
    kind = body.kind if body.kind in ("expense", "income") else "expense"
    cats = (await db.execute(select(Category).where(Category.user_id == current_user.id))).scalars().all()

    if body.parent_id is not None:
        parent = next((c for c in cats if c.id == body.parent_id), None)
        if not parent:
            raise HTTPException(status_code=404, detail="Parent category not found")
        if parent.parent_id is not None:
            raise HTTPException(status_code=422, detail="Subcategories can't be nested further (max 2 levels)")
        kind = parent.kind or "expense"  # a subcategory inherits its parent's kind

    if _dup_category(cats, name, kind, body.parent_id):
        raise HTTPException(status_code=400, detail="A category with this name already exists here")

    category = Category(user_id=current_user.id, name=name, kind=kind, parent_id=body.parent_id, icon=body.icon)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None


@router.patch("/categories/{category_id}")
async def update_category(category_id: uuid.UUID, body: CategoryUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    cats = (await db.execute(select(Category).where(Category.user_id == current_user.id))).scalars().all()
    category = next((c for c in cats if c.id == category_id), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    new_parent_id = category.parent_id
    if "parent_id" in body.model_fields_set:
        new_parent_id = body.parent_id
        if new_parent_id is not None:
            if new_parent_id == category.id:
                raise HTTPException(status_code=422, detail="Category cannot be its own parent")
            parent = next((c for c in cats if c.id == new_parent_id), None)
            if not parent:
                raise HTTPException(status_code=404, detail="Parent category not found")
            if parent.parent_id is not None:
                raise HTTPException(status_code=422, detail="Subcategories can't be nested further (max 2 levels)")
            if (parent.kind or "expense") != (category.kind or "expense"):
                raise HTTPException(status_code=422, detail="Can't move a category between income and expense")
            if any(c.parent_id == category.id for c in cats):
                raise HTTPException(status_code=422, detail="Category has subcategories and cannot become a subcategory itself")
        category.parent_id = new_parent_id

    if body.name is not None and body.name.strip() and body.name.strip() != category.name:
        if _dup_category(cats, body.name, category.kind or "expense", new_parent_id, exclude_id=category.id):
            raise HTTPException(status_code=400, detail="A category with this name already exists here")
        category.name = body.name.strip()

    if body.icon is not None:
        category.icon = body.icon

    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
async def delete_category(category_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    cats = (await db.execute(select(Category).where(Category.user_id == current_user.id))).scalars().all()
    category = next((c for c in cats if c.id == category_id), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Deleting a parent removes its subcategories too; any transaction referencing
    # the deleted category (or its subs) becomes "Uncategorized".
    victim_ids = [category.id] + [c.id for c in cats if c.parent_id == category.id]
    moved = 0
    exps = (await db.execute(select(FinanceExpense).where(
        FinanceExpense.user_id == current_user.id, FinanceExpense.category_id.in_(victim_ids)))).scalars().all()
    for e in exps:
        e.category_id = None
        e.category = "Uncategorized"
        db.add(e)
        moved += 1
    incs = (await db.execute(select(FinanceIncome).where(
        FinanceIncome.user_id == current_user.id, FinanceIncome.category_id.in_(victim_ids)))).scalars().all()
    for i in incs:
        i.category_id = None
        i.source = "Uncategorized"
        db.add(i)
        moved += 1

    # `finance_pending_transactions.category_id` and `finance_merchant_rules.
    # category_id` are NOT cleared here on purpose: both are written by the Gmail
    # ingestion pipeline outside this router, so hand-clearing them would leave
    # every other writer broken. Migration f002 gives all four category FKs
    # ON DELETE SET NULL — the constraint owns that, not this handler.
    for c in [c for c in cats if c.parent_id == category.id]:
        await db.delete(c)
    await db.delete(category)
    await db.commit()
    return {"status": "deleted", "uncategorized": moved}


# ── Investments (portfolio tracker) ────────────────────────────────────────────

@router.get("/investments")
async def list_investments(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id).order_by(desc(FinanceInvestment.current_value)))
    return result.scalars().all()


@router.get("/investments/summary")
async def investments_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id))
    investments = result.scalars().all()

    total_invested = sum(float(i.invested_amount) for i in investments)
    total_current = sum(float(i.current_value) for i in investments)
    returns_amount = total_current - total_invested
    returns_pct = round((returns_amount / total_invested) * 100, 2) if total_invested > 0 else 0.0
    # Committed vs actual: sum of monthly SIP commitments across holdings that declare one.
    total_committed_monthly = sum(
        float(i.committed_monthly) for i in investments if i.committed_monthly is not None
    )

    by_type: dict[str, float] = {}
    for i in investments:
        by_type[i.type] = by_type.get(i.type, 0.0) + float(i.current_value)
    allocation = [{"type": t, "value": v} for t, v in sorted(by_type.items(), key=lambda x: -x[1])]

    return {
        "total_invested": total_invested,
        "current_value": total_current,
        "returns_amount": returns_amount,
        "returns_pct": returns_pct,
        "committed_monthly": total_committed_monthly,
        "allocation": allocation,
    }


@router.get("/investments/performance")
async def investments_performance(
    days: int = 180, current_user=Depends(get_current_user), db=Depends(get_db)
):
    """XIRR, realised SIP rate and the portfolio value series.

    All three are things `invested_amount`/`current_value` cannot express:
    those two scalars know the size of the position but not *when* the money
    went in, and timing is what separates a good return from a lucky one.
    """
    from datetime import date as date_type

    days = max(7, min(1095, days))
    today = date_type.today()
    since = today - timedelta(days=days)

    holdings = (await db.execute(
        select(FinanceInvestment).where(FinanceInvestment.user_id == current_user.id)
    )).scalars().all()

    txns = (await db.execute(
        select(InvestmentTransaction)
        .where(InvestmentTransaction.user_id == current_user.id)
        .order_by(InvestmentTransaction.transacted_at)
    )).scalars().all()

    total_current = sum(float(h.current_value) for h in holdings)

    # Portfolio-level XIRR over every cashflow, closed off at today's value.
    portfolio_rate = portfolio_xirr(
        [(t.transacted_at, t.kind, float(t.amount)) for t in txns],
        total_current,
        today,
    )

    # Per-holding, so a single bad position is visible instead of averaged away.
    by_holding: dict[uuid.UUID, list[InvestmentTransaction]] = {}
    for t in txns:
        by_holding.setdefault(t.investment_id, []).append(t)

    holdings_out = []
    for h in holdings:
        rows = by_holding.get(h.id, [])
        rate = portfolio_xirr(
            [(t.transacted_at, t.kind, float(t.amount)) for t in rows],
            float(h.current_value),
            today,
        )
        invested = float(h.invested_amount)
        holdings_out.append({
            "id": str(h.id),
            "name": h.name,
            "type": h.type,
            "invested": invested,
            "current_value": float(h.current_value),
            "gain": float(h.current_value) - invested,
            "gain_pct": round(((float(h.current_value) - invested) / invested) * 100, 2)
            if invested > 0 else 0.0,
            # None means "not enough dated cashflows to compute it" — the UI
            # must render that as unknown, never as 0%.
            "xirr_pct": round(rate * 100, 2) if rate is not None else None,
            "cashflow_count": len(rows),
        })

    # Realised SIP: what actually went in per month over the last 3 months,
    # as opposed to `committed_monthly`, which is only an intention.
    sip_window_start = datetime.utcnow() - timedelta(days=92)
    sip_flows = [
        float(t.amount) for t in txns
        if t.kind == "buy" and t.is_sip and t.transacted_at >= sip_window_start
    ]
    realised_sip_monthly = round(sum(sip_flows) / 3, 2) if sip_flows else 0.0

    valuations = (await db.execute(
        select(InvestmentValuation)
        .where(
            InvestmentValuation.user_id == current_user.id,
            InvestmentValuation.as_of >= since,
        )
        .order_by(InvestmentValuation.as_of)
    )).scalars().all()

    return {
        "xirr_pct": round(portfolio_rate * 100, 2) if portfolio_rate is not None else None,
        "committed_monthly": sum(
            float(h.committed_monthly) for h in holdings if h.committed_monthly is not None
        ),
        "realised_sip_monthly": realised_sip_monthly,
        "holdings": holdings_out,
        "series": [
            {"date": v.as_of.isoformat(), "invested": float(v.invested), "value": float(v.value)}
            for v in valuations
        ],
    }


@router.get("/investments/transactions")
async def list_investment_transactions(
    investment_id: Optional[uuid.UUID] = None,
    limit: int = 200,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = select(InvestmentTransaction).where(
        InvestmentTransaction.user_id == current_user.id
    )
    if investment_id is not None:
        query = query.where(InvestmentTransaction.investment_id == investment_id)
    result = await db.execute(
        query.order_by(desc(InvestmentTransaction.transacted_at)).limit(max(1, min(1000, limit)))
    )
    return result.scalars().all()


_INVESTMENT_TXN_KINDS = {"buy", "sell", "dividend"}


class InvestmentTransactionCreate(BaseModel):
    investment_id: uuid.UUID
    kind: str = "buy"
    amount: float = Field(gt=0)
    units: Optional[float] = None
    transacted_at: NaiveDateTime = None
    is_sip: bool = False
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/investments/transactions")
async def create_investment_transaction(
    body: InvestmentTransactionCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if body.kind not in _INVESTMENT_TXN_KINDS:
        raise HTTPException(
            status_code=422, detail=f"kind must be one of {sorted(_INVESTMENT_TXN_KINDS)}"
        )
    holding = (await db.execute(
        select(FinanceInvestment).where(
            FinanceInvestment.id == body.investment_id,
            FinanceInvestment.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if not holding:
        raise HTTPException(status_code=404, detail="Investment not found")

    row = InvestmentTransaction(
        user_id=current_user.id,
        investment_id=body.investment_id,
        kind=body.kind,
        amount=Decimal(str(body.amount)),
        units=Decimal(str(body.units)) if body.units is not None else None,
        transacted_at=body.transacted_at or datetime.utcnow(),
        is_sip=body.is_sip,
        notes=body.notes,
        account_id=body.account_id,
    )
    db.add(row)

    # Keep the holding's own totals true, so the summary endpoint and the
    # cashflow ledger cannot drift apart.
    delta = Decimal(str(body.amount))
    if body.kind == "buy":
        holding.invested_amount = holding.invested_amount + delta
        holding.current_value = holding.current_value + delta
        if body.units is not None:
            holding.units = (holding.units or Decimal("0")) + Decimal(str(body.units))
    elif body.kind == "sell":
        holding.current_value = max(Decimal("0"), holding.current_value - delta)
        if body.units is not None:
            holding.units = max(Decimal("0"), (holding.units or Decimal("0")) - Decimal(str(body.units)))
    # A dividend is cash out of the holding, not a change in its book value.

    holding.updated_at = datetime.utcnow()
    db.add(holding)

    if body.account_id is not None:
        # Buying moves money out of the funding account; selling and dividends
        # move it back in.
        signed = -body.amount if body.kind == "buy" else body.amount
        await _adjust_balance(db, body.account_id, signed, current_user.id)

    await db.commit()
    await db.refresh(row)
    return row


@router.delete("/investments/transactions/{transaction_id}")
async def delete_investment_transaction(
    transaction_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)
):
    row = (await db.execute(
        select(InvestmentTransaction).where(
            InvestmentTransaction.id == transaction_id,
            InvestmentTransaction.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")

    holding = await db.get(FinanceInvestment, row.investment_id)
    if holding and holding.user_id == current_user.id:
        if row.kind == "buy":
            holding.invested_amount = max(Decimal("0"), holding.invested_amount - row.amount)
            holding.current_value = max(Decimal("0"), holding.current_value - row.amount)
            if row.units is not None:
                holding.units = max(Decimal("0"), (holding.units or Decimal("0")) - row.units)
        elif row.kind == "sell":
            holding.current_value = holding.current_value + row.amount
            if row.units is not None:
                holding.units = (holding.units or Decimal("0")) + row.units
        holding.updated_at = datetime.utcnow()
        db.add(holding)

    if row.account_id is not None:
        signed = float(row.amount) if row.kind == "buy" else -float(row.amount)
        await _adjust_balance(db, row.account_id, signed, current_user.id)

    await db.delete(row)
    await db.commit()
    return {"status": "deleted"}


class InvestmentCreate(BaseModel):
    name: str
    type: str = "mutual_fund"
    invested_amount: float = Field(gt=0)
    current_value: float = Field(ge=0)
    units: Optional[float] = None
    purchase_date: Optional[str] = None  # ISO date YYYY-MM-DD
    committed_monthly: Optional[float] = Field(default=None, ge=0)  # SIP commitment
    notes: Optional[str] = None


@router.post("/investments")
async def create_investment(body: InvestmentCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    from datetime import date as date_type
    investment = FinanceInvestment(
        user_id=current_user.id,
        name=body.name,
        type=body.type,
        invested_amount=body.invested_amount,
        current_value=body.current_value,
        units=body.units,
        purchase_date=date_type.fromisoformat(body.purchase_date) if body.purchase_date else None,
        committed_monthly=body.committed_monthly,
        notes=body.notes,
    )
    db.add(investment)
    await db.commit()
    await db.refresh(investment)
    return investment


class InvestmentUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    invested_amount: Optional[float] = None
    current_value: Optional[float] = None
    units: Optional[float] = None
    purchase_date: Optional[str] = None
    committed_monthly: Optional[float] = None
    notes: Optional[str] = None


@router.patch("/investments/{investment_id}")
async def update_investment(investment_id: uuid.UUID, body: InvestmentUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id, FinanceInvestment.user_id == current_user.id))
    investment = result.scalar_one_or_none()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    from datetime import date as date_type
    data = body.model_dump(exclude_unset=True)
    if "purchase_date" in data:
        data["purchase_date"] = date_type.fromisoformat(data["purchase_date"]) if data["purchase_date"] else None
    for field, value in data.items():
        setattr(investment, field, value)
    investment.updated_at = datetime.utcnow()
    db.add(investment)
    await db.commit()
    await db.refresh(investment)
    return investment


@router.delete("/investments/{investment_id}")
async def delete_investment(investment_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceInvestment).where(FinanceInvestment.id == investment_id, FinanceInvestment.user_id == current_user.id))
    investment = result.scalar_one_or_none()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    await db.delete(investment)
    await db.commit()
    return {"status": "deleted"}


# ── Loans / EMI tracker ────────────────────────────────────────────

@router.get("/loans")
async def list_loans(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id).order_by(desc(FinanceLoan.is_active), FinanceLoan.emi_day))
    return result.scalars().all()


@router.get("/loans/summary")
async def loans_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.user_id == current_user.id, FinanceLoan.is_active == True))
    loans = result.scalars().all()
    total_outstanding = sum(float(l.outstanding_amount) for l in loans)
    total_emi = sum(float(l.emi_amount) for l in loans)

    # Interest paid TO DATE — the figure the canvas asks for, and the one the
    # loan row alone could never answer. Reads the amortization split recorded
    # on each paid EMI; loans paid before that split existed contribute 0
    # rather than a fabricated estimate.
    payments = (await db.execute(
        select(ObligationPayment).where(
            ObligationPayment.user_id == current_user.id,
            ObligationPayment.obligation_type == "loan",
            ObligationPayment.paid == True,  # noqa: E712 — SQL, not Python truthiness
        )
    )).scalars().all()
    interest_paid = sum(float(p.interest_component or 0) for p in payments)
    principal_paid = sum(float(p.principal_component or 0) for p in payments)

    return {
        "total_outstanding": total_outstanding,
        "total_emi": total_emi,
        "active_count": len(loans),
        "interest_paid_to_date": round(interest_paid, 2),
        "principal_paid_to_date": round(principal_paid, 2),
        "payments_recorded": len(payments),
    }


@router.get("/loans/{loan_id}/payments")
async def loan_payments(
    loan_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)
):
    """Payment history for one loan, with the principal/interest split per EMI."""
    loan = (await db.execute(
        select(FinanceLoan).where(
            FinanceLoan.id == loan_id, FinanceLoan.user_id == current_user.id
        )
    )).scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    rows = (await db.execute(
        select(ObligationPayment)
        .where(
            ObligationPayment.user_id == current_user.id,
            ObligationPayment.obligation_type == "loan",
            ObligationPayment.obligation_id == loan_id,
            ObligationPayment.paid == True,  # noqa: E712
        )
        .order_by(ObligationPayment.period)
    )).scalars().all()

    return {
        "loan_id": str(loan_id),
        "outstanding": float(loan.outstanding_amount),
        "payments": [
            {
                "period": r.period,
                "paid_at": r.paid_at.isoformat() if r.paid_at else None,
                "amount": float(r.paid_amount) if r.paid_amount is not None else float(loan.emi_amount),
                # None (not 0) for payments recorded before the split existed —
                # the UI has to distinguish "no interest" from "not known".
                "principal": float(r.principal_component) if r.principal_component is not None else None,
                "interest": float(r.interest_component) if r.interest_component is not None else None,
            }
            for r in rows
        ],
    }


class LoanCreate(BaseModel):
    name: str
    loan_type: str = "personal"
    lender: Optional[str] = None
    principal_amount: float = Field(gt=0)
    outstanding_amount: float = Field(ge=0)
    interest_rate: float = Field(ge=0)
    emi_amount: float = Field(gt=0)
    emi_day: int
    tenure_months: Optional[int] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.post("/loans")
async def create_loan(body: LoanCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    loan = FinanceLoan(
        user_id=current_user.id,
        name=body.name,
        loan_type=body.loan_type,
        lender=body.lender,
        principal_amount=body.principal_amount,
        outstanding_amount=body.outstanding_amount,
        interest_rate=body.interest_rate,
        emi_amount=body.emi_amount,
        emi_day=body.emi_day,
        tenure_months=body.tenure_months,
        notes=body.notes,
        account_id=body.account_id,
    )
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


class LoanUpdate(BaseModel):
    name: Optional[str] = None
    loan_type: Optional[str] = None
    lender: Optional[str] = None
    principal_amount: Optional[float] = None
    outstanding_amount: Optional[float] = None
    interest_rate: Optional[float] = None
    emi_amount: Optional[float] = None
    emi_day: Optional[int] = None
    tenure_months: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None
    account_id: Optional[uuid.UUID] = None


@router.patch("/loans/{loan_id}")
async def update_loan(loan_id: uuid.UUID, body: LoanUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id, FinanceLoan.user_id == current_user.id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(loan, field, value)
    loan.updated_at = datetime.utcnow()
    db.add(loan)
    await db.commit()
    await db.refresh(loan)
    return loan


@router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(FinanceLoan).where(FinanceLoan.id == loan_id, FinanceLoan.user_id == current_user.id))
    loan = result.scalar_one_or_none()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    await db.delete(loan)
    await db.commit()
    return {"status": "deleted"}
