import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Optional
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy import Text, Numeric, UniqueConstraint


class FinanceSnapshot(SQLModel, table=True):
    __tablename__ = "finance_snapshots"
    __table_args__ = (UniqueConstraint("user_id", "snapshot_month", name="uq_snapshot_user_month"),)

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    snapshot_month: date = Field(nullable=False)
    salary: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    take_home: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    net_worth: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    cc_debt: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    emergency_fund: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    total_expenses: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_estimated: bool = Field(default=False, nullable=False)
    source: str = Field(default="vault_sync", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class AccountType(str, Enum):
    CHECKING = "checking"
    SAVINGS = "savings"
    CREDIT_CARD = "credit_card"
    INVESTMENT = "investment"
    LOAN = "loan"

class Account(SQLModel, table=True):
    __tablename__ = "finance_accounts"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    type: AccountType = Field(nullable=False)
    balance: Decimal = Field(default=0, sa_column=Column(Numeric(12, 2)))
    currency: str = Field(default="INR", nullable=False)
    # Sanctioned limit on a credit card. Only meaningful for type=credit_card;
    # NULL everywhere else, which is what makes utilization unanswerable for a
    # card the user has not filled in rather than silently zero.
    credit_limit: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    # Sync health, written by whatever last refreshed the balance (the email
    # tracker today). NULL last_synced_at = never synced, i.e. manual-only.
    last_synced_at: Optional[datetime] = Field(default=None)
    sync_status: Optional[str] = Field(default=None)  # ok | stale | error
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)

class Category(SQLModel, table=True):
    __tablename__ = "finance_categories"
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    # Income and expense have separate category trees.
    kind: str = Field(default="expense", nullable=False)  # "expense" | "income"
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    icon: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    # Uniqueness (same name within a parent + kind) is enforced in the API layer:
    # a global (user_id, name) unique constraint would wrongly block reusing a
    # subcategory name (e.g. "Other") under different parents or in both trees.

class FinanceExpense(SQLModel, table=True):
    __tablename__ = "finance_expenses"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    logged_at: datetime = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    category: Optional[str] = Field(nullable=True)
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    source: str = Field(default="agent", nullable=False)
    split_group_id: Optional[uuid.UUID] = Field(default=None)  # siblings of one split payment
    tags: Optional[str] = Field(default=None)  # comma-separated freeform labels
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class BudgetLimit(SQLModel, table=True):
    """Monthly spending cap per category. One row per (user, category)."""
    __tablename__ = "budget_limits"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True, nullable=False)
    category: str = Field(primary_key=True, nullable=False)
    monthly_limit: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    alert_80_period: Optional[str] = Field(default=None)
    alert_100_period: Optional[str] = Field(default=None)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class FinancialGoal(SQLModel, table=True):
    """Savings goals like Jupiter Pots / ET Money goals."""
    __tablename__ = "finance_goals"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    icon: str = Field(default="🎯", nullable=False)
    target_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    current_amount: Decimal = Field(default=0, sa_column=Column(Numeric(12, 2)))
    deadline: Optional[date] = None
    category: str = Field(default="general", nullable=False)  # emergency/vacation/car/education/general
    color: str = Field(default="#0D9488", nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceBill(SQLModel, table=True):
    """Recurring bill tracker like Walnut/CRED."""
    __tablename__ = "finance_bills"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    due_day: int = Field(nullable=False)  # day of month 1-31
    category: str = Field(default="utilities", nullable=False)
    is_auto_debit: bool = Field(default=False)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    last_posted_period: Optional[str] = Field(default=None)  # "YYYY-MM" of last auto-posted expense
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceIncome(SQLModel, table=True):
    """Income log — salary, freelance, etc."""
    __tablename__ = "finance_income"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    source: str = Field(nullable=False)  # denormalized top-level category name (rollup/back-compat)
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    tags: Optional[str] = Field(default=None)  # comma-separated freeform labels
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    logged_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceTransfer(SQLModel, table=True):
    """Account-to-account transfer — Money Manager style third transaction type."""
    __tablename__ = "finance_transfers"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    from_account_id: uuid.UUID = Field(foreign_key="finance_accounts.id", nullable=False)
    to_account_id: uuid.UUID = Field(foreign_key="finance_accounts.id", nullable=False)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    logged_at: datetime = Field(nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceInvestment(SQLModel, table=True):
    """Portfolio holding — like INDmoney/ET Money investment tracker."""
    __tablename__ = "finance_investments"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    type: str = Field(default="mutual_fund", nullable=False)  # stock/mutual_fund/fd/ppf/nps/crypto/gold/other
    invested_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    current_value: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    units: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(14, 4)))
    purchase_date: Optional[date] = None
    # Monthly SIP / commitment target — lets the summary compare committed vs actually-invested.
    committed_monthly: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())


class FinanceLoan(SQLModel, table=True):
    """EMI / loan tracker — like Money View / Walnut loan management."""
    __tablename__ = "finance_loans"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    name: str = Field(nullable=False)
    loan_type: str = Field(default="personal", nullable=False)  # home/personal/car/education/credit_card/other
    lender: Optional[str] = Field(default=None)
    principal_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    outstanding_amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    interest_rate: Decimal = Field(sa_column=Column(Numeric(5, 2), nullable=False))  # annual %
    emi_amount: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    emi_day: int = Field(nullable=False)  # day of month 1-31
    tenure_months: Optional[int] = Field(default=None)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    last_posted_period: Optional[str] = Field(default=None)  # "YYYY-MM" of last auto-posted EMI
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow())
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow())

class FinancePendingTransaction(SQLModel, table=True):
    """Transactions ingested from bank/CC email alerts (or AI agents) awaiting user review."""
    __tablename__ = "finance_pending_transactions"
    # Idempotent ingestion: one email → at most one pending row per user. NULL source_email_id
    # (manual / agent-queued rows) is exempt — Postgres treats NULLs as distinct.
    __table_args__ = (
        UniqueConstraint("user_id", "source_email_id", name="uq_pending_user_email"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)

    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    transaction_type: str = Field(default="expense", nullable=False) # "expense" or "income"

    payee_name: Optional[str] = Field(default=None)
    suggested_category: Optional[str] = Field(default=None)
    # suggested_category resolved to a real node at insert time, so the review
    # UI's category picker arrives pre-filled.
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    description: Optional[str] = Field(default=None, sa_column=Column(Text))

    logged_at: datetime = Field(nullable=False)
    raw_email_snippet: str = Field(sa_column=Column(Text, nullable=False))

    # Idempotency (main's Gmail flow): bank txn ref when present, else a hash of
    # kind|date|amount|payee. Re-runs / statement lines matching a queued txn are skipped.
    dedupe_key: Optional[str] = Field(default=None, index=True)
    txn_ref: Optional[str] = Field(default=None)
    # Provenance: which email (and which linked Gmail account) produced this.
    gmail_message_id: Optional[str] = Field(default=None)
    source_account_email: Optional[str] = Field(default=None)
    # Regex-ingestion (Finance OS) provenance: Gmail message id it was parsed from (also unique
    # per user via __table_args__), the full body for re-parse on drift, and the bank parser slug.
    source_email_id: Optional[str] = Field(default=None, index=True)
    raw_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    parser: Optional[str] = Field(default=None)

    # NULL = never auto-commit (review required — the default). Set to a time only when the user
    # opts into timed auto-commit; the regex runner sets now+24h.
    auto_commit_at: Optional[datetime] = Field(default=None, nullable=True)
    status: str = Field(default="pending", nullable=False) # pending / approved / dismissed
    # How and when the row left the queue. `auto_commit_at` cannot answer this:
    # it is a deadline, and a user who approves before it still leaves it set,
    # so "filed automatically" was previously indistinguishable from "reviewed
    # in time".
    committed_at: Optional[datetime] = Field(default=None)
    auto_committed: bool = Field(default=False, nullable=False)

    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class MerchantRule(SQLModel, table=True):
    """User-defined auto-categorisation rule applied to ingested transactions."""
    __tablename__ = "finance_merchant_rules"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    match_type: str = Field(default="contains", nullable=False)  # contains | equals | regex
    pattern: str = Field(nullable=False)  # matched against payee_name/description (case-insensitive)
    category_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_categories.id")
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    priority: int = Field(default=0, nullable=False)  # higher priority wins on tie
    is_active: bool = Field(default=True, nullable=False)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class CCBill(SQLModel, table=True):
    """Credit-card statement summary — a payable, not a ledger line (avoids double-counting spends)."""
    __tablename__ = "finance_cc_bills"
    __table_args__ = (
        UniqueConstraint("user_id", "source_email_id", name="uq_cc_bill_email"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    card_name: Optional[str] = Field(default=None)  # label when no account is linked
    statement_date: Optional[date] = Field(default=None)
    due_date: Optional[date] = Field(default=None)
    total_due: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    min_due: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    unbilled: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    paid_at: Optional[datetime] = Field(default=None)
    paid_amount: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    source_email_id: Optional[str] = Field(default=None, index=True)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class ObligationPayment(SQLModel, table=True):
    """Per-(obligation, month) paid state driving the month-end payables checklist.

    obligation_type ∈ {bill, loan, cc_bill}; obligation_id points at the source row.
    """
    __tablename__ = "finance_obligation_payments"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "obligation_type", "obligation_id", "period",
            name="uq_obligation_payment",
        ),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    obligation_type: str = Field(nullable=False)  # bill | loan | cc_bill
    obligation_id: uuid.UUID = Field(nullable=False)
    period: str = Field(nullable=False)  # "YYYY-MM"
    paid: bool = Field(default=False, nullable=False)
    paid_at: Optional[datetime] = Field(default=None)
    paid_amount: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    # Amortization split, written only for obligation_type="loan" at the moment
    # the payment is marked paid — the interest share depends on the outstanding
    # balance *at that time*, so it cannot be recomputed correctly afterwards.
    principal_component: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    interest_component: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(12, 2)))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class GoalContribution(SQLModel, table=True):
    """One deposit toward a savings goal.

    `FinancialGoal.current_amount` stays the running total (it is what every
    existing summary reads); these rows are what make "how much did I put in
    per month" answerable, which a single running total never can.
    """
    __tablename__ = "finance_goal_contributions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    goal_id: uuid.UUID = Field(foreign_key="finance_goals.id", index=True, nullable=False)
    # Negative = a withdrawal from the goal, so the series can go down.
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    contributed_at: datetime = Field(nullable=False)
    note: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class InvestmentTransaction(SQLModel, table=True):
    """A dated cashflow against a holding — the input XIRR needs.

    `FinanceInvestment.invested_amount`/`current_value` remain the holding's
    present state. Return maths needs *when* money moved, which those two
    scalars discard, so buys/sells/dividends are recorded here.
    """
    __tablename__ = "finance_investment_transactions"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    investment_id: uuid.UUID = Field(
        foreign_key="finance_investments.id", index=True, nullable=False
    )
    kind: str = Field(default="buy", nullable=False)  # buy | sell | dividend
    amount: Decimal = Field(sa_column=Column(Numeric(12, 2), nullable=False))
    units: Optional[Decimal] = Field(default=None, sa_column=Column(Numeric(14, 4)))
    transacted_at: datetime = Field(nullable=False)
    # True when the row was generated by the recurring-SIP poster rather than
    # entered by hand — lets "monthly SIP" mean committed, not incidental.
    is_sip: bool = Field(default=False, nullable=False)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    account_id: Optional[uuid.UUID] = Field(default=None, foreign_key="finance_accounts.id")
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class InvestmentValuation(SQLModel, table=True):
    """Point-in-time portfolio value, one row per (user, day).

    Written by the nightly job. Without it "portfolio value over time" can only
    be drawn from the single `current_value` the user last typed in.
    """
    __tablename__ = "finance_investment_valuations"
    __table_args__ = (
        UniqueConstraint("user_id", "as_of", name="uq_investment_valuation_day"),
    )

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    user_id: uuid.UUID = Field(foreign_key="users.id", index=True, nullable=False)
    as_of: date = Field(nullable=False)
    invested: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))
    value: Decimal = Field(sa_column=Column(Numeric(14, 2), nullable=False))
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)


class FinanceSettings(SQLModel, table=True):
    """Per-user finance preferences. One row per user, created lazily."""
    __tablename__ = "finance_settings"

    user_id: uuid.UUID = Field(foreign_key="users.id", primary_key=True, nullable=False)
    # NULL = auto-commit off (pending transactions wait for explicit review).
    auto_commit_hours: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
    updated_at: datetime = Field(default_factory=lambda: datetime.utcnow(), nullable=False)
