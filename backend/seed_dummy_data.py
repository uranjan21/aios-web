"""Seed a realistic dataset for ONE user so every frontend surface has data.

    docker compose exec backend python seed_dummy_data.py                  # demo@aios.dev
    docker compose exec backend python seed_dummy_data.py --email you@x.com
    docker compose exec backend python seed_dummy_data.py --list           # who can be seeded
    docker compose exec backend python seed_dummy_data.py --keep           # add without wiping

Design notes, because the previous version of this file got two things wrong:

* **User-scoped, never global.** It used to run `Account.__table__.delete()`,
  which wipes that table for EVERY user — unusable on a multi-tenant database.
  Everything here filters on `user_id`, and the wipe walks
  `SQLModel.metadata.sorted_tables` in reverse (children before parents) so
  foreign keys are satisfied without a hand-maintained ordering.
* **Dates are anchored to today.** The dashboards filter by "this month",
  "this week" and a 12-week heatmap, so absolute dates go stale and every page
  renders empty. Every timestamp here is `TODAY - n days`.

Re-running is safe: it wipes only this user's seeded rows, then rebuilds. Rows
the app owns rather than the seeder (users, subscriptions, integration
credentials, agents) are never touched.
"""
import argparse
import asyncio
import random
import sys
import uuid
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from sqlalchemy import delete as sa_delete, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

import app.models  # noqa: F401 — registers every table in metadata
from app.db.session import engine
from app.models.user import User

RNG = random.Random(20260810)
TODAY = date.today()
NOW = datetime.now().replace(microsecond=0)


def days_ago(n: int) -> date:
    return TODAY - timedelta(days=n)


def dt_ago(n: int, hour: int = 12, minute: int = 0) -> datetime:
    """Naive local datetime. Finance `logged_at` columns are TIMESTAMP WITHOUT
    TIME ZONE — asyncpg rejects tz-aware values against them."""
    return datetime.combine(TODAY - timedelta(days=n), time(hour, minute))


def money(x) -> Decimal:
    return Decimal(str(x)).quantize(Decimal("0.01"))


# Tables this script owns. The wipe touches these and nothing else, so account
# identity, billing and OAuth survive a re-seed.
SEEDED_TABLES = {
    "captures", "plan_blocks", "calendar_events", "briefings", "briefing_preferences",
    "finance_accounts", "finance_expenses", "finance_income", "finance_transfers",
    "finance_snapshots", "budget_limits", "finance_bills", "finance_loans",
    "finance_investments", "finance_investment_transactions", "finance_investment_valuations",
    "finance_goals", "finance_goal_contributions", "finance_pending_transactions",
    "finance_merchant_rules", "finance_cc_bills", "finance_obligation_payments",
    "finance_settings",
    "health_logs", "health_goals", "health_habits", "health_habit_checks",
    "health_workout_routines", "health_routine_days", "health_routine_exercises",
    "health_workout_sessions", "health_workout_sets",
    "health_meal_plans", "health_meal_plan_entries", "google_fit_metrics",
    "career_events", "career_journal_entries", "career_learning_resources",
    "career_employment_roles", "skill_inventory", "job_opportunities",
    "macro_goals", "goal_progress", "projects", "sprints", "tasks", "workspace_milestones",
    "chat_sessions", "chat_messages", "agent_actions",
    "insights", "forecasts", "automation_rules", "saved_quotes", "knowledge_sources",
}


async def wipe(s: AsyncSession, uid, existing: set[str]) -> int:
    """Delete this user's rows from the seeded tables, children first."""
    n = 0
    for t in reversed(SQLModel.metadata.sorted_tables):
        if t.name not in SEEDED_TABLES or t.name not in existing:
            continue
        if "user_id" not in t.columns:
            continue
        res = await s.execute(
            text(f'DELETE FROM "{t.name}" WHERE user_id = :uid'), {"uid": str(uid)}
        )
        n += res.rowcount or 0
    await s.commit()
    return n


# ── Finance ───────────────────────────────────────────────────────────────────

# Top-level -> children. Transactions store `category_id` (the leaf) AND
# `category` (the TOP-LEVEL ancestor name) so by-category reports roll up.
EXPENSE_TREE = {
    "Food":          ["Groceries", "Restaurants", "Coffee", "Food delivery"],
    "Transport":     ["Fuel", "Cabs", "Metro", "Parking"],
    "Housing":       ["Rent", "Electricity", "Water", "Internet", "Maintenance"],
    "Shopping":      ["Clothes", "Electronics", "Home", "Gifts"],
    "Health":        ["Pharmacy", "Doctor", "Gym", "Insurance"],
    "Entertainment": ["Streaming", "Movies", "Events", "Books"],
    "Subscriptions": ["Software", "Cloud", "News"],
    "Personal":      ["Grooming", "Education", "Charity"],
}
INCOME_TREE = {
    "Salary":     ["Base pay", "Bonus"],
    "Freelance":  ["Consulting", "Design work"],
    "Investment": ["Dividends", "Interest"],
    "Other":      ["Refunds", "Gifts received"],
}


async def ensure_categories(s: AsyncSession, uid) -> dict:
    """Get-or-create the 2-level category tree. Deliberately NOT wiped — the
    tree is reference data, and re-creating it would orphan nothing but churn
    ids on every run."""
    from app.models.finance import Category

    rows = (await s.execute(select(Category).where(Category.user_id == uid))).scalars().all()
    by_key = {(r.kind, r.name, r.parent_id): r for r in rows}
    out = {"expense": {}, "income": {}}

    for kind, tree in (("expense", EXPENSE_TREE), ("income", INCOME_TREE)):
        for parent_name, children in tree.items():
            parent = by_key.get((kind, parent_name, None))
            if parent is None:
                parent = Category(user_id=uid, name=parent_name, kind=kind, parent_id=None)
                s.add(parent)
                await s.flush()
                by_key[(kind, parent_name, None)] = parent
            leaves = []
            for child_name in children:
                child = by_key.get((kind, child_name, parent.id))
                if child is None:
                    child = Category(user_id=uid, name=child_name, kind=kind, parent_id=parent.id)
                    s.add(child)
                    await s.flush()
                    by_key[(kind, child_name, parent.id)] = child
                leaves.append(child)
            out[kind][parent_name] = (parent, leaves)
    await s.commit()
    return out


async def seed_finance(s: AsyncSession, uid, cats: dict) -> dict:
    from app.models.finance import (
        Account, FinanceExpense, FinanceIncome, FinanceTransfer, FinanceSnapshot,
        BudgetLimit, FinanceBill, FinanceLoan, FinanceInvestment, FinancialGoal,
        GoalContribution, FinanceSettings,
        FinancePendingTransaction, MerchantRule, CCBill,
        ObligationPayment, InvestmentTransaction, InvestmentValuation,
    )

    # -- accounts --------------------------------------------------------------
    # `type` is a Postgres ENUM (accounttype): checking/savings/credit_card/
    # investment/loan. Use the enum members, not strings — there is no "bank"
    # or "cash" and a bad literal fails at INSERT, not at import.
    from app.models.finance import AccountType

    salary_ac = Account(user_id=uid, name="HDFC Salary", type=AccountType.CHECKING,
                        balance=money(184500), currency="INR", sync_status="manual")
    savings_ac = Account(user_id=uid, name="ICICI Savings", type=AccountType.SAVINGS,
                         balance=money(512000), currency="INR", sync_status="manual")
    card_ac = Account(user_id=uid, name="Amex Platinum", type=AccountType.CREDIT_CARD,
                      balance=money(-48300), currency="INR", credit_limit=money(400000),
                      sync_status="manual")
    cash_ac = Account(user_id=uid, name="Zerodha", type=AccountType.INVESTMENT,
                      balance=money(214800), currency="INR", sync_status="manual")
    accounts = [salary_ac, savings_ac, card_ac, cash_ac]
    s.add_all(accounts)
    await s.flush()

    s.add(FinanceSettings(user_id=uid, auto_commit_hours=None))

    # -- expenses: ~120 days, weighted so charts have shape ---------------------
    weights = {
        "Food": 34, "Transport": 16, "Housing": 6, "Shopping": 12,
        "Health": 7, "Entertainment": 9, "Subscriptions": 6, "Personal": 10,
    }
    pool = [name for name, w in weights.items() for _ in range(w)]
    merchants = {
        "Food": ["Blinkit", "Swiggy", "Zomato", "Third Wave Coffee", "Nature's Basket"],
        "Transport": ["Uber", "Ola", "Indian Oil", "Namma Metro", "Rapido"],
        "Housing": ["Landlord", "BESCOM", "ACT Fibernet", "BWSSB"],
        "Shopping": ["Amazon", "Myntra", "Croma", "IKEA"],
        "Health": ["Apollo Pharmacy", "Cult.fit", "Practo", "1mg"],
        "Entertainment": ["Netflix", "PVR", "BookMyShow", "Spotify"],
        "Subscriptions": ["GitHub", "AWS", "Notion", "Claude Pro"],
        "Personal": ["Urban Company", "Coursera", "Give India"],
    }
    ranges = {
        "Food": (120, 2400), "Transport": (60, 1800), "Housing": (1200, 32000),
        "Shopping": (400, 12000), "Health": (200, 4500), "Entertainment": (199, 2500),
        "Subscriptions": (149, 3200), "Personal": (300, 6000),
    }

    expenses = []
    for d in range(119, -1, -1):
        for _ in range(RNG.choice([1, 2, 2, 3, 3, 4])):
            top = RNG.choice(pool)
            parent, leaves = cats["expense"][top]
            leaf = RNG.choice(leaves)
            lo, hi = ranges[top]
            acct = RNG.choice([salary_ac, card_ac, card_ac, cash_ac])
            expenses.append(FinanceExpense(
                user_id=uid,
                logged_at=dt_ago(d, RNG.randint(8, 22), RNG.choice([0, 15, 30, 45])),
                amount=money(RNG.randint(lo, hi)),
                category=parent.name,          # top-level rollup
                category_id=leaf.id,           # exact leaf
                account_id=acct.id,
                description=f"{RNG.choice(merchants[top])} — {leaf.name.lower()}",
                source=RNG.choice(["manual", "manual", "upi-tracker"]),
            ))
    # Rent on the 1st of each month — a recurring anchor the charts can show.
    housing_parent, housing_leaves = cats["expense"]["Housing"]
    rent_leaf = next(l for l in housing_leaves if l.name == "Rent")
    for m in range(4):
        first = (TODAY.replace(day=1) - timedelta(days=31 * m)).replace(day=1)
        if first > TODAY:
            continue
        expenses.append(FinanceExpense(
            user_id=uid, logged_at=datetime.combine(first, time(9, 0)),
            amount=money(38000), category=housing_parent.name, category_id=rent_leaf.id,
            account_id=salary_ac.id, description="Landlord — monthly rent", source="manual",
        ))
    s.add_all(expenses)

    # -- income ----------------------------------------------------------------
    sal_parent, sal_leaves = cats["income"]["Salary"]
    base_leaf = next(l for l in sal_leaves if l.name == "Base pay")
    fl_parent, fl_leaves = cats["income"]["Freelance"]
    incomes = []
    for m in range(4):
        pay_day = (TODAY.replace(day=1) - timedelta(days=31 * m)).replace(day=1)
        if pay_day > TODAY:
            continue
        incomes.append(FinanceIncome(
            user_id=uid, amount=money(285000), source=sal_parent.name, category_id=base_leaf.id,
            account_id=salary_ac.id, description="Takeda — monthly salary",
            logged_at=datetime.combine(pay_day, time(10, 0)),
        ))
    for d in (12, 41, 73):
        incomes.append(FinanceIncome(
            user_id=uid, amount=money(RNG.randint(18000, 65000)), source=fl_parent.name,
            category_id=RNG.choice(fl_leaves).id, account_id=savings_ac.id,
            description="Ledgr consulting retainer", logged_at=dt_ago(d, 18),
        ))
    s.add_all(incomes)

    # -- transfers -------------------------------------------------------------
    s.add_all([
        FinanceTransfer(user_id=uid, amount=money(60000), from_account_id=salary_ac.id,
                        to_account_id=savings_ac.id, description="Monthly savings sweep",
                        logged_at=dt_ago(d, 11))
        for d in (2, 33, 64, 95)
    ] + [
        FinanceTransfer(user_id=uid, amount=money(48300), from_account_id=salary_ac.id,
                        to_account_id=card_ac.id, description="Amex bill payment",
                        logged_at=dt_ago(18, 20)),
    ])

    # -- monthly snapshots -----------------------------------------------------
    for m in range(6):
        month = (TODAY.replace(day=1) - timedelta(days=31 * m)).replace(day=1)
        s.add(FinanceSnapshot(
            user_id=uid, snapshot_month=month, salary=money(320000), take_home=money(285000),
            net_worth=money(1850000 - m * 62000), cc_debt=money(48300 + m * 3000),
            emergency_fund=money(512000 - m * 18000),
            total_expenses=money(RNG.randint(135000, 178000)),
            source="seed", is_estimated=False,
        ))

    # -- budgets (some deliberately near/over limit so the UI shows all states) --
    for cat, limit in [("Food", 40000), ("Transport", 12000), ("Shopping", 20000),
                       ("Entertainment", 8000), ("Subscriptions", 6000), ("Health", 10000)]:
        s.add(BudgetLimit(user_id=uid, category=cat, monthly_limit=money(limit)))

    # -- bills, loans ----------------------------------------------------------
    bills = [
        FinanceBill(user_id=uid, name="Rent", amount=money(38000), due_day=1, category="Housing",
                    is_auto_debit=False, account_id=salary_ac.id),
        FinanceBill(user_id=uid, name="ACT Fibernet", amount=money(1499), due_day=7,
                    category="Housing", is_auto_debit=True, account_id=salary_ac.id),
        FinanceBill(user_id=uid, name="Electricity", amount=money(2600), due_day=12,
                    category="Housing", is_auto_debit=False, account_id=salary_ac.id),
        FinanceBill(user_id=uid, name="Cult.fit", amount=money(1800), due_day=15,
                    category="Health", is_auto_debit=True, account_id=card_ac.id),
        FinanceBill(user_id=uid, name="AWS", amount=money(3200), due_day=20,
                    category="Subscriptions", is_auto_debit=True, account_id=card_ac.id),
    ]
    s.add_all(bills)

    loans = [
        # Deliberately late in its term. Net worth = accounts + investments −
        # loans, and the property itself is not modelled as an asset, so a
        # freshly-drawn home loan makes the headline KPI negative and red for
        # reasons that have nothing to do with the demo.
        FinanceLoan(user_id=uid, name="Home loan", loan_type="home", lender="HDFC",
                    principal_amount=money(4200000), outstanding_amount=money(980000),
                    interest_rate=Decimal("8.45"), emi_amount=money(36800), emi_day=5,
                    tenure_months=240, account_id=salary_ac.id),
        FinanceLoan(user_id=uid, name="Car loan", loan_type="vehicle", lender="ICICI",
                    principal_amount=money(900000), outstanding_amount=money(412000),
                    interest_rate=Decimal("9.10"), emi_amount=money(18400), emi_day=10,
                    tenure_months=60, account_id=salary_ac.id),
    ]
    s.add_all(loans)
    await s.flush()

    # Paid/unpaid history so the Bills page has both states.
    for m in range(1, 4):
        period = ((TODAY.replace(day=1) - timedelta(days=31 * m)).replace(day=1)).strftime("%Y-%m")
        for ln in loans:
            s.add(ObligationPayment(
                user_id=uid, obligation_type="loan", obligation_id=ln.id, period=period,
                paid=True, paid_at=dt_ago(30 * m, 9), paid_amount=ln.emi_amount,
                account_id=salary_ac.id,
                principal_component=money(float(ln.emi_amount) * 0.55),
                interest_component=money(float(ln.emi_amount) * 0.45),
            ))
        for b in bills[:3]:
            s.add(ObligationPayment(
                user_id=uid, obligation_type="bill", obligation_id=b.id, period=period,
                paid=True, paid_at=dt_ago(30 * m, 10), paid_amount=b.amount,
                account_id=salary_ac.id,
            ))

    s.add(CCBill(
        user_id=uid, account_id=card_ac.id, card_name="Amex Platinum",
        statement_date=days_ago(9), due_date=days_ago(-11), total_due=money(48300),
        min_due=money(2415), unbilled=money(12750),
    ))

    # -- investments -----------------------------------------------------------
    invs = [
        FinanceInvestment(user_id=uid, name="Parag Parikh Flexi Cap", type="mutual_fund",
                          invested_amount=money(480000), current_value=money(612400),
                          units=Decimal("7412.55"), purchase_date=days_ago(700),
                          committed_monthly=money(20000)),
        FinanceInvestment(user_id=uid, name="UTI Nifty 50 Index", type="mutual_fund",
                          invested_amount=money(300000), current_value=money(361200),
                          units=Decimal("2140.10"), purchase_date=days_ago(520),
                          committed_monthly=money(10000)),
        FinanceInvestment(user_id=uid, name="EPF", type="retirement",
                          invested_amount=money(920000), current_value=money(1043000),
                          purchase_date=days_ago(1400)),
        FinanceInvestment(user_id=uid, name="Sovereign Gold Bond", type="bond",
                          invested_amount=money(150000), current_value=money(186500),
                          units=Decimal("25"), purchase_date=days_ago(900)),
        FinanceInvestment(user_id=uid, name="Emergency FD", type="fixed_deposit",
                          invested_amount=money(200000), current_value=money(214800),
                          purchase_date=days_ago(300)),
    ]
    s.add_all(invs)
    await s.flush()

    for inv in invs[:2]:  # monthly SIPs
        for m in range(10):
            d = (TODAY.replace(day=1) - timedelta(days=31 * m)).replace(day=5)
            if d > TODAY:
                continue
            s.add(InvestmentTransaction(
                user_id=uid, investment_id=inv.id, kind="buy",
                amount=inv.committed_monthly, units=money(RNG.uniform(20, 80)),
                transacted_at=datetime.combine(d, time(9, 30)), is_sip=True,
                account_id=salary_ac.id, notes="Monthly SIP",
            ))
    # Portfolio curve — 18 monthly points so the growth chart has a line.
    inv_total, val_total = money(2050000), money(2418000)
    for m in range(17, -1, -1):
        s.add(InvestmentValuation(
            user_id=uid, as_of=(TODAY.replace(day=1) - timedelta(days=30 * m)).replace(day=1),
            invested=money(float(inv_total) * (1 - m * 0.026)),
            value=money(float(val_total) * (1 - m * 0.031)),
        ))

    # -- savings pots ----------------------------------------------------------
    goals = [
        FinancialGoal(user_id=uid, name="Emergency fund", icon="shield", target_amount=money(900000),
                      current_amount=money(512000), deadline=days_ago(-240), category="safety",
                      color="#2563eb"),
        FinancialGoal(user_id=uid, name="Japan trip", icon="plane", target_amount=money(350000),
                      current_amount=money(148000), deadline=days_ago(-150), category="travel",
                      color="#c8a449"),
        FinancialGoal(user_id=uid, name="New laptop", icon="laptop", target_amount=money(280000),
                      current_amount=money(265000), deadline=days_ago(-45), category="gear",
                      color="#16a34a"),
    ]
    s.add_all(goals)
    await s.flush()
    for g in goals:
        for m in range(5):
            s.add(GoalContribution(
                user_id=uid, goal_id=g.id, amount=money(RNG.randint(8000, 30000)),
                contributed_at=dt_ago(30 * m + 3, 20), account_id=savings_ac.id,
                note="Monthly top-up",
            ))

    # -- inbox: pending transactions awaiting review ---------------------------
    food_parent, food_leaves = cats["expense"]["Food"]
    shop_parent, shop_leaves = cats["expense"]["Shopping"]
    pend = [
        ("Swiggy", 742, food_leaves[1], "UPI/SWIGGY/428831"),
        ("Amazon Pay", 3499, shop_leaves[1], "UPI/AMZN/771204"),
        ("Blinkit", 1268, food_leaves[0], "UPI/BLINKIT/902334"),
        ("Indian Oil", 2200, cats["expense"]["Transport"][1][0], "UPI/IOCL/553219"),
        ("PVR Cinemas", 980, cats["expense"]["Entertainment"][1][1], "UPI/PVR/119002"),
    ]
    for i, (payee, amt, leaf, ref) in enumerate(pend):
        s.add(FinancePendingTransaction(
            user_id=uid, amount=money(amt), transaction_type="expense", payee_name=payee,
            suggested_category=leaf.name, category_id=leaf.id, account_id=card_ac.id,
            description=f"{payee} payment", logged_at=dt_ago(i, 13),
            raw_email_snippet=f"Rs.{amt}.00 debited from your card ending 4412 at {payee} on "
                              f"{days_ago(i):%d-%b-%Y}. Ref {ref}.",
            dedupe_key=ref, txn_ref=ref, source_account_email="alerts@hdfcbank.net",
            parser="hdfc_card", status="pending", auto_commit_at=None,
        ))

    s.add_all([
        MerchantRule(user_id=uid, match_type="contains", pattern="swiggy",
                     category_id=food_leaves[1].id, account_id=card_ac.id, priority=10),
        MerchantRule(user_id=uid, match_type="contains", pattern="uber",
                     category_id=cats["expense"]["Transport"][1][1].id, account_id=card_ac.id,
                     priority=20),
        MerchantRule(user_id=uid, match_type="starts_with", pattern="AWS",
                     category_id=cats["expense"]["Subscriptions"][1][1].id,
                     account_id=card_ac.id, priority=30),
    ])
    return {"accounts": accounts, "goals": goals}


# ── Health ────────────────────────────────────────────────────────────────────

async def seed_health(s: AsyncSession, uid):
    from app.models.health import (
        HealthLog, HealthGoal, Habit, HabitCheck, WorkoutSession, WorkoutSet,
    )
    from app.models.health import (
        WorkoutRoutine, RoutineDay, RoutineExercise, MealPlan, MealPlanEntry, FoodItem,
    )
    from app.models.google_sync import GoogleFitMetric

    s.add(HealthGoal(
        id=str(uid), user_id=uid, calorie_target=2300, protein_target=160, carb_target=240,
        fat_target=70, water_target=3, steps_target=9000, sleep_target=7.5,
        height_cm=176, target_weight=74.0, target_workouts_per_week=4,
        target_water_l_per_day=3.0,
    ))

    # -- 120 days of daily metrics (weight trends down, the point of the chart) --
    weight = 82.4
    for d in range(119, -1, -1):
        weight -= RNG.uniform(-0.06, 0.13)
        s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 7, 30), entry_type="weight",
                        value=money(round(weight, 1)), unit="kg", source="seed"))
        s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 23, 0), entry_type="steps",
                        value=money(RNG.randint(3200, 14500)), unit="steps", source="seed"))
        s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 6, 45), entry_type="sleep",
                        value=money(round(RNG.uniform(5.4, 8.6), 1)), unit="h", source="seed"))
        s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 21, 0), entry_type="water",
                        value=money(round(RNG.uniform(1.6, 3.8), 1)), unit="l", source="seed"))
        if d % 7 == 0:
            s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 7, 35), entry_type="body_fat",
                            value=money(round(RNG.uniform(18.5, 24.0), 1)), unit="%", source="seed"))
        for meal, hour, kcal in (("Breakfast", 9, (350, 600)), ("Lunch", 14, (550, 900)),
                                 ("Dinner", 21, (450, 850))):
            s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, hour, 0), entry_type="meal",
                            value=money(RNG.randint(*kcal)), unit="kcal",
                            notes=f"{meal} — {RNG.choice(['dal rice', 'paneer wrap', 'chicken bowl', 'oats', 'idli sambar', 'egg bhurji'])}",
                            source="seed"))
        s.add(GoogleFitMetric(
            user_id=uid, date=days_ago(d).isoformat(), steps=float(RNG.randint(3200, 14500)),
            calories=float(RNG.randint(1900, 2900)), distance_m=float(RNG.randint(2200, 11000)),
            weight_kg=round(weight, 1), heart_rate_bpm=float(RNG.randint(58, 78)),
        ))

    # -- routines --------------------------------------------------------------
    push = WorkoutRoutine(user_id=uid, name="Push day", notes="Chest, shoulders, triceps", is_active=True)
    pull = WorkoutRoutine(user_id=uid, name="Pull day", notes="Back, biceps", is_active=True)
    legs = WorkoutRoutine(user_id=uid, name="Leg day", notes="Quads, hamstrings, calves", is_active=True)
    s.add_all([push, pull, legs])
    await s.flush()

    # A list of tuples, not a dict keyed by the routine: SQLModel rows are
    # pydantic models and therefore unhashable.
    plan = [
        (push, ["Bench press", "Overhead press", "Incline dumbbell press", "Cable fly", "Triceps pushdown"], [0, 3]),
        (pull, ["Deadlift", "Pull-up", "Barbell row", "Face pull", "Barbell curl"], [1, 4]),
        (legs, ["Back squat", "Romanian deadlift", "Leg press", "Walking lunge", "Calf raise"], [2, 5]),
    ]
    for routine, exercises, weekdays in plan:
        for wd in weekdays:
            s.add(RoutineDay(user_id=uid, routine_id=routine.id, weekday=wd))
        for i, ex in enumerate(exercises):
            s.add(RoutineExercise(user_id=uid, routine_id=routine.id, exercise=ex,
                                  target_sets=4, target_reps=RNG.choice([6, 8, 10, 12]),
                                  target_weight_kg=money(RNG.choice([20, 40, 60, 80, 100])),
                                  position=i))

    # -- 12 weeks of sessions (adherence + volume charts) ----------------------
    for d in range(83, -1, -1):
        day = days_ago(d)
        if day.weekday() not in (0, 1, 2, 3, 4, 5):
            continue
        if RNG.random() > 0.62:          # realistic ~60% adherence
            continue
        routine, exercises, _ = plan[day.weekday() % 3]
        sess = WorkoutSession(user_id=uid, name=routine.name, routine_id=routine.id,
                              logged_at=dt_ago(d, 19, 0), notes=RNG.choice(
                                  ["Felt strong", "Low energy", "PR attempt", "", "Deload"]))
        s.add(sess)
        await s.flush()
        for ex in exercises[:4]:
            for sn in range(1, RNG.choice([3, 4]) + 1):
                s.add(WorkoutSet(user_id=uid, session_id=sess.id, exercise=ex, set_number=sn,
                                 reps=RNG.randint(5, 12),
                                 weight_kg=money(RNG.choice([20, 30, 40, 50, 60, 70, 80, 90, 100]))))
        s.add(HealthLog(user_id=uid, logged_at=dt_ago(d, 19, 0), entry_type="gym",
                        value=money(1), unit="session", notes=routine.name, source="seed"))

    # -- foods + meal plan -----------------------------------------------------
    # Get-or-create: `health_food_items` carries UNIQUE(user_id, name) and is
    # NOT in SEEDED_TABLES — the food database is reference data the user (or a
    # prior import) may already own, so re-running must not delete it.
    want = [
        ("Paneer bhurji", 290, 18, 8, 21, "1 bowl", 150),
        ("Grilled chicken breast", 165, 31, 0, 3.6, "100 g", 100),
        ("Masoor dal", 116, 9, 20, 0.4, "1 katori", 120),
        ("Brown rice", 123, 2.7, 26, 1, "1 katori", 110),
        ("Greek yoghurt", 97, 10, 4, 5, "1 cup", 150),
        ("Whey shake", 120, 24, 3, 1.5, "1 scoop", 30),
    ]
    existing_foods = {
        f.name: f for f in (await s.execute(
            select(FoodItem).where(FoodItem.user_id == uid)
        )).scalars().all()
    }
    foods = []
    for name, kcal, p, c, f_, desc, grams in want:
        row = existing_foods.get(name)
        if row is None:
            row = FoodItem(user_id=uid, name=name, calories=kcal, protein=p, carbs=c, fat=f_,
                           serving_desc=desc, serving_grams=grams, is_custom=True)
            s.add(row)
        foods.append(row)
    await s.flush()

    mp = MealPlan(user_id=uid, name="Cut — 2300 kcal", notes="High protein, moderate carb",
                  is_active=True)
    s.add(mp)
    await s.flush()
    for wd in range(7):
        for pos, (mt, food) in enumerate([
            ("breakfast", foods[4]), ("lunch", foods[2]), ("snack", foods[5]), ("dinner", foods[1]),
        ]):
            s.add(MealPlanEntry(user_id=uid, plan_id=mp.id, weekday=wd, meal_type=mt,
                                food_id=food.id, quantity_grams=food.serving_grams, position=pos))

    # -- habits ----------------------------------------------------------------
    habits = [
        Habit(user_id=uid, name="10k steps", icon="footprints", is_active=True),
        Habit(user_id=uid, name="Read 20 min", icon="book", is_active=True),
        Habit(user_id=uid, name="No sugar", icon="candy-off", is_active=True),
        Habit(user_id=uid, name="Meditate", icon="brain", is_active=True),
    ]
    s.add_all(habits)
    await s.flush()
    for h in habits:
        for d in range(59, -1, -1):
            if RNG.random() < 0.68:
                s.add(HabitCheck(user_id=uid, habit_id=h.id, check_date=days_ago(d).isoformat()))


# ── Career ────────────────────────────────────────────────────────────────────

async def seed_career(s: AsyncSession, uid):
    from app.models.career import (
        CareerEvent, SkillInventory, JobOpportunity, CareerJournalEntry,
        LearningResource, EmploymentRole,
    )

    skills = [
        ("React", "Frontend", "expert"), ("TypeScript", "Frontend", "expert"),
        ("styled-components", "Frontend", "proficient"), ("Next.js", "Frontend", "competent"),
        ("Python", "Backend", "proficient"), ("FastAPI", "Backend", "competent"),
        ("PostgreSQL", "Backend", "competent"), ("SQLModel", "Backend", "practitioner"),
        ("Docker", "DevOps", "practitioner"), ("GitHub Actions", "DevOps", "beginner"),
        ("Kubernetes", "DevOps", "day_0"), ("Terraform", "DevOps", "day_0"),
        ("System design", "Architecture", "practitioner"),
        ("RAG pipelines", "AI", "beginner"), ("LangGraph", "AI", "day_0"),
        ("Prompt engineering", "AI", "competent"), ("Go", "Backend", "day_0"),
    ]
    skill_rows = [SkillInventory(user_id=uid, skill_name=n, category=c, level=l,
                                 last_updated=NOW - timedelta(days=RNG.randint(1, 90)))
                  for n, c, l in skills]
    s.add_all(skill_rows)
    await s.flush()
    by_name = {r.skill_name: r for r in skill_rows}

    s.add_all([
        LearningResource(user_id=uid, title="Kubernetes Up & Running", kind="book",
                         provider="O'Reilly", status="in_progress", progress_pct=45,
                         skill_id=by_name["Kubernetes"].id, started_at=days_ago(30),
                         notes="Ch. 7 — services"),
        LearningResource(user_id=uid, title="Terraform: Up & Running", kind="book",
                         provider="O'Reilly", status="planned", progress_pct=0,
                         skill_id=by_name["Terraform"].id),
        LearningResource(user_id=uid, title="Building LLM apps with LangGraph", kind="course",
                         provider="DeepLearning.AI", status="in_progress", progress_pct=70,
                         skill_id=by_name["LangGraph"].id, started_at=days_ago(21),
                         url="https://learn.deeplearning.ai"),
        LearningResource(user_id=uid, title="Designing Data-Intensive Applications", kind="book",
                         provider="O'Reilly", status="completed", progress_pct=100,
                         skill_id=by_name["System design"].id, started_at=days_ago(210),
                         completed_at=days_ago(64), notes="Re-read ch. 5–9"),
        LearningResource(user_id=uid, title="A Tour of Go", kind="course", provider="go.dev",
                         status="planned", progress_pct=0, skill_id=by_name["Go"].id,
                         url="https://go.dev/tour"),
        LearningResource(user_id=uid, title="Advanced RAG patterns", kind="video",
                         provider="YouTube", status="abandoned", progress_pct=20,
                         skill_id=by_name["RAG pipelines"].id, started_at=days_ago(120)),
    ])

    s.add_all([
        EmploymentRole(user_id=uid, company="Takeda", title="Full Stack Developer",
                       employment_type="full_time", location="Bangalore, IN",
                       start_date=days_ago(430), end_date=None,
                       description="React + FastAPI platform work across data products."),
        EmploymentRole(user_id=uid, company="Freelance", title="Product Engineer",
                       employment_type="contract", location="Remote",
                       start_date=days_ago(900), end_date=days_ago(440),
                       description="Built Ledgr, a SaaS for CA firms."),
        EmploymentRole(user_id=uid, company="Zeta", title="Frontend Engineer",
                       employment_type="full_time", location="Bangalore, IN",
                       start_date=days_ago(1600), end_date=days_ago(910),
                       description="Design-system and payments dashboards."),
    ])

    s.add_all([
        JobOpportunity(user_id=uid, company="Stripe", role="Product Engineer", status="interview",
                       applied_date=dt_ago(24), url="https://stripe.com/jobs",
                       notes="Round 2 — system design on 12th."),
        JobOpportunity(user_id=uid, company="Linear", role="Full Stack Engineer", status="applied",
                       applied_date=dt_ago(9), notes="Referred by ex-colleague."),
        JobOpportunity(user_id=uid, company="Vercel", role="Frontend Engineer", status="screening",
                       applied_date=dt_ago(15)),
        JobOpportunity(user_id=uid, company="Anthropic", role="Member of Technical Staff",
                       status="prospect", notes="Watch the careers page."),
        JobOpportunity(user_id=uid, company="Razorpay", role="SDE-3", status="offer",
                       applied_date=dt_ago(58), notes="₹68L total comp — deciding."),
        JobOpportunity(user_id=uid, company="Swiggy", role="SDE-2", status="rejected",
                       applied_date=dt_ago(96), notes="Rejected after round 3."),
    ])

    events = [
        ("promotion", "Promoted to Full Stack Developer", 200),
        ("skill", "Shipped first FastAPI service to prod", 150),
        ("win", "Ledgr crossed 20 paying firms", 96),
        ("talk", "Internal talk: design systems at scale", 64),
        ("skill", "Completed DDIA", 64),
        ("win", "Cut dashboard p95 from 3.2s to 700ms", 30),
        ("interview", "Stripe round 1 cleared", 24),
        ("win", "Control Tower pre-ship audit done", 1),
    ]
    for kind, title, d in events:
        s.add(CareerEvent(user_id=uid, occurred_at=dt_ago(d, 17), event_type=kind, title=title,
                          description="Auto-seeded milestone.", source="seed"))

    # A day-0 entry so the dashboard's "Career streak" tile is non-zero and the
    # journal opens on something written today rather than a gap.
    journals = [
        (0, "Seeded the whole dataset",
         "Filled every domain with realistic data so the app can actually be walked end to end. "
         "The interesting part was how many surfaces key off *today* specifically — a dataset "
         "with no rows dated today reads as an empty product."),
        (2, "Shipping beats polishing",
         "Spent the morning on the pre-ship audit. The thing I keep relearning: the bugs that "
         "matter are the ones you can only see by running the real artifact, not by reading it."),
        (6, "On saying no to scope",
         "Three features asked for this week. Took one. The other two were nice-to-have dressed "
         "up as urgent."),
        (13, "System design reps",
         "Did a mock on rate limiting. Fumbled the token-bucket-vs-sliding-window tradeoff. "
         "Need to write it out by hand until it's automatic."),
        (21, "Interviewing is a separate skill",
         "Stripe round 1 went fine but I talked too long before asking clarifying questions."),
        (34, "Reading DDIA again",
         "Chapter 7 on transactions is the one that keeps paying rent."),
        (48, "Burnout check",
         "Two weeks of nights on Ledgr. Sleep average is 6.1h. Pulling back to weekends only."),
        (67, "The Ledgr wedge",
         "CA firms don't want another dashboard. They want the reconciliation to already be done."),
        (90, "Frontend to fullstack",
         "A year in, the backend no longer feels like someone else's code."),
    ]
    for d, title, body in journals:
        s.add(CareerJournalEntry(user_id=uid, entry_date=days_ago(d), title=title, body=body,
                           tags="reflection,career", word_count=len(body.split()),
                           created_at=NOW - timedelta(days=d), updated_at=NOW - timedelta(days=d)))


# ── Workspace, assistant, insights ────────────────────────────────────────────

async def seed_workspace(s: AsyncSession, uid):
    from app.models.goal import MacroGoal, GoalProgress
    from app.models.workspace import Project, Sprint, Task, Milestone, PlanBlock

    goals = [
        MacroGoal(user_id=uid, title="Ship Control Tower to production", category="career",
                  description="Public launch with billing off.", target_date=days_ago(-30),
                  status="active", priority="high"),
        MacroGoal(user_id=uid, title="Cut to 74 kg at 15% body fat", category="health",
                  description="Recomp over two quarters.", target_date=days_ago(-120),
                  status="active", priority="high"),
        MacroGoal(user_id=uid, title="₹9L emergency fund", category="finance",
                  description="6 months of runway.", target_date=days_ago(-240),
                  status="active", priority="medium"),
        MacroGoal(user_id=uid, title="Land a senior product-engineering role", category="career",
                  target_date=days_ago(-90), status="active", priority="high"),
        MacroGoal(user_id=uid, title="Clear the car loan", category="finance",
                  target_date=days_ago(-400), status="active", priority="low"),
    ]
    s.add_all(goals)
    await s.flush()

    for g in goals:
        for wk in range(9, -1, -1):
            s.add(GoalProgress(
                user_id=uid, goal_id=g.id, date_recorded=days_ago(wk * 7),
                progress_score=max(5, min(95, 30 + (9 - wk) * RNG.randint(3, 9))),
                ai_insight="Weekly review score." if wk == 0 else None,
            ))

    ms = [
        ("Security headers + CSP at the edge", "career", goals[0], -2, "hit"),
        ("Pre-ship audit complete", "career", goals[0], -1, "hit"),
        ("Domain + TLS live", "career", goals[0], 7, "upcoming"),
        ("First 10 external signups", "career", goals[0], 30, "upcoming"),
        ("Hit 78 kg", "health", goals[1], -14, "hit"),
        ("Hit 76 kg", "health", goals[1], 45, "at_risk"),
        ("₹6L saved", "finance", goals[2], -30, "hit"),
        ("₹7.5L saved", "finance", goals[2], 90, "upcoming"),
        ("Stripe onsite", "career", goals[3], 21, "upcoming"),
        ("Two offers in hand", "career", goals[3], 60, "upcoming"),
    ]
    for i, (title, domain, goal, offset, status) in enumerate(ms):
        s.add(Milestone(user_id=uid, goal_id=goal.id, title=title, domain=domain,
                        due_date=days_ago(-offset), status=status, position=i,
                        description="Seeded milestone."))

    projects = [
        Project(user_id=uid, name="Control Tower launch", domain="career", goal_id=goals[0].id,
                status="active", priority="high", color="#c8a449", due_date=days_ago(-30),
                description="Everything between audit and public launch.", labels="launch,infra"),
        Project(user_id=uid, name="Ledgr v2", domain="career", status="active", priority="medium",
                color="#2563eb", due_date=days_ago(-75), description="CA-firm SaaS rewrite."),
        Project(user_id=uid, name="Recomp block 3", domain="health", goal_id=goals[1].id,
                status="active", priority="medium", color="#16a34a", due_date=days_ago(-60)),
        Project(user_id=uid, name="Money system cleanup", domain="finance", goal_id=goals[2].id,
                status="active", priority="low", color="#7c3aed"),
        Project(user_id=uid, name="Portfolio site", domain="career", status="archived",
                priority="low", color="#64748b"),
    ]
    s.add_all(projects)
    await s.flush()

    sprints = [
        Sprint(user_id=uid, project_id=projects[0].id, name="Launch week", status="active",
               start_date=days_ago(3), end_date=days_ago(-4), capacity=20,
               goals="Ship TLS, verify backups, first signups."),
        Sprint(user_id=uid, project_id=projects[0].id, name="Hardening", status="completed",
               start_date=days_ago(17), end_date=days_ago(4), capacity=18,
               goals="Audit findings closed."),
        Sprint(user_id=uid, project_id=projects[0].id, name="Post-launch", status="planned",
               start_date=days_ago(-5), end_date=days_ago(-19), capacity=15),
        Sprint(user_id=uid, project_id=projects[1].id, name="Reconciliation engine",
               status="active", start_date=days_ago(6), end_date=days_ago(-8), capacity=24),
    ]
    s.add_all(sprints)
    await s.flush()

    # due_offset 0 = due TODAY. The dashboard's "Tasks due today" tile and
    # "Today's Focus" list read exactly that, so a few must land on today or the
    # busiest page in the app renders its empty state on a fully seeded account.
    tasks = [
        ("Point DNS at the VPS", "career", "todo", "high", 0, 0, 0),
        ("Set SITE_ADDRESS + ALLOWED_ORIGIN to https", "career", "todo", "high", 0, 0, 0),
        ("Register https OAuth redirect URIs", "career", "todo", "high", 2, 0, 0),
        ("Verify nightly backup cron on VPS", "career", "in_progress", "medium", 0, 0, 0),
        ("Smoke-test signup → verify → login", "career", "todo", "high", 3, 0, 0),
        ("Write launch post", "career", "todo", "low", 6, 0, 0),
        ("Close CSP follow-ups", "career", "done", "medium", -1, 0, 1),
        ("Add pre-deploy pg_dump", "career", "done", "high", -2, 0, 1),
        ("Fix mobile landing header", "career", "done", "high", -1, 0, 1),
        ("Bank reconciliation matcher", "career", "in_progress", "high", 5, 1, 3),
        ("Invoice PDF export", "career", "todo", "medium", 9, 1, 3),
        ("Multi-firm switcher", "career", "todo", "low", 14, 1, 3),
        ("Hit 4 gym sessions this week", "health", "in_progress", "medium", 0, 2, None),
        ("Meal-prep Sunday", "health", "todo", "low", 4, 2, None),
        ("Book blood panel", "health", "todo", "medium", 11, 2, None),
        ("Cancel unused subscriptions", "finance", "todo", "medium", 3, 3, None),
        ("Rebalance portfolio", "finance", "todo", "low", 20, 3, None),
        ("File advance tax", "finance", "todo", "high", 8, 3, None),
    ]
    for title, domain, status, prio, due_offset, pidx, sidx in tasks:
        s.add(Task(
            user_id=uid, title=title, domain=domain, status=status, priority=prio,
            due_date=days_ago(-due_offset),
            project_id=projects[pidx].id if pidx is not None else None,
            sprint_id=sprints[sidx].id if sidx is not None else None,
            description="Seeded task.",
        ))

    # This week's calendar-style planner blocks.
    monday = TODAY - timedelta(days=TODAY.weekday())
    blocks = [
        (0, 9, 11, "Deep work — launch checklist", "career", True),
        (0, 19, 20, "Push day", "health", False),
        (1, 10, 12, "Ledgr reconciliation engine", "career", True),
        (1, 18, 19, "Pull day", "health", False),
        (2, 9, 10, "Weekly finance review", "finance", False),
        (2, 14, 16, "Interview prep — system design", "career", True),
        (3, 19, 20, "Leg day", "health", False),
        (4, 15, 17, "Write launch post", "career", False),
        (5, 11, 12, "Meal prep", "health", False),
    ]
    for wd, sh, eh, title, domain, prio in blocks:
        s.add(PlanBlock(user_id=uid, block_date=monday + timedelta(days=wd),
                        start_time=time(sh, 0), end_time=time(eh, 0), title=title,
                        domain=domain, is_priority=prio))

    # Calendar events feed the Dashboard "Schedule" module and Today/This week.
    # These are normally written by the Google Calendar sync; the seeded rows use
    # a `seed-` google_event_id prefix so a real sync can tell them apart. NOTE:
    # seeding a Google-connected account replaces its synced rows until the next
    # sync runs — that is why the id prefix exists.
    from app.models.google_sync import CalendarEvent

    meetings = [
        (0, 10, 11, "Sprint planning", "Zoom"),
        (0, 16, 17, "1:1 with manager", "Meet"),
        (1, 11, 12, "Stripe — system design round", "Google Meet"),
        (2, 9, 10, "Standup", "Zoom"),
        (2, 15, 16, "Ledgr customer call", "Phone"),
        (3, 13, 14, "Architecture review", "Meet"),
        (4, 12, 13, "Lunch with Priya", "Toit, Indiranagar"),
        (4, 17, 18, "Retro", "Zoom"),
        (6, 10, 12, "Dentist", "Koramangala"),
    ]
    for i, (wd, sh, eh, title, loc) in enumerate(meetings):
        day = monday + timedelta(days=wd)
        s.add(CalendarEvent(
            user_id=uid, google_event_id=f"seed-{uid}-{i}", title=title,
            description="Seeded calendar event.",
            start_time=datetime.combine(day, time(sh, 0)),
            end_time=datetime.combine(day, time(eh, 0)),
            location=loc, status="confirmed",
        ))


async def seed_assistant_and_insights(s: AsyncSession, uid):
    from app.models.chat import ChatSession, ChatMessage
    from app.models.insights import Insight, Briefing, BriefingPreference
    from app.models.forecast import Forecast
    from app.models.automations import AutomationRule
    from app.models.quote import SavedQuote
    from app.models.captures import Capture
    from app.models.action import AgentAction
    from app.models.knowledge import KnowledgeSource

    convos = [
        ("Where did my money go this month?", [
            ("user", "Where did my money go this month?"),
            ("assistant", "Your top three categories month-to-date are **Food ₹31,240**, "
                          "**Shopping ₹18,900** and **Transport ₹9,110**. Food is tracking 78% "
                          "of its ₹40,000 budget with 9 days left — on pace to land around "
                          "₹43,000, so it will go over by roughly ₹3,000."),
        ]),
        ("Am I on track for 74 kg?", [
            ("user", "Am I on track to hit 74 kg?"),
            ("assistant", "You're at 76.8 kg, down 5.6 kg over 120 days — about 0.33 kg/week. "
                          "At that rate you'd reach 74 kg in roughly 8 weeks, which lands just "
                          "inside your target date. Sleep is averaging 6.9h; the weeks you slept "
                          "under 6.5h are the weeks the trend flattened."),
        ]),
        ("Prep me for the Stripe interview", [
            ("user", "What should I revise before the Stripe system design round?"),
            ("assistant", "Based on your journal, the gap you named twice is token-bucket vs "
                          "sliding-window rate limiting. I'd also revise idempotency keys for "
                          "payment APIs — that comes up in almost every Stripe loop."),
        ]),
    ]
    for title, msgs in convos:
        sess = ChatSession(user_id=uid, title=title, started_at=NOW - timedelta(days=RNG.randint(1, 20)),
                           last_message_at=NOW - timedelta(days=RNG.randint(0, 1)),
                           tokens_used=RNG.randint(900, 3400), input_tokens=RNG.randint(600, 2200),
                           output_tokens=RNG.randint(300, 1200))
        s.add(sess)
        await s.flush()
        for i, (role, content) in enumerate(msgs):
            s.add(ChatMessage(user_id=uid, session_id=sess.id, role=role, content=content,
                              tokens_used=len(content) // 4,
                              created_at=NOW - timedelta(days=1, minutes=10 - i)))

    s.add_all([
        Insight(user_id=uid, kind="correlation",
                title="Short sleep tracks with higher food spend",
                body="On days after under 6.5h of sleep you spend 38% more on food delivery. "
                     "12 of the last 15 delivery orders followed a short night.",
                metric_a="sleep_hours", metric_b="food_delivery_spend", r=-0.62, n=118, lag=1,
                score=0.81, status="new"),
        Insight(user_id=uid, kind="correlation",
                title="Gym days have fewer impulse purchases",
                body="Shopping spend is 44% lower on days you log a workout.",
                metric_a="gym_sessions", metric_b="shopping_spend", r=-0.44, n=84, lag=0,
                score=0.66, status="new"),
        Insight(user_id=uid, kind="trend",
                title="Subscriptions crept up 22% this quarter",
                body="Three new recurring charges since May: Claude Pro, Notion, AWS.",
                metric_a="subscription_spend", metric_b="month", r=0.71, n=6, lag=0,
                score=0.58, status="acknowledged"),
    ])

    for domain, metric, value, conf, insight in [
        ("finance", "month_end_balance", 142000.0, 0.78, "On current burn you end the month ~₹142k."),
        ("finance", "net_worth", 1912000.0, 0.64, "Net worth trends up ~₹62k/month."),
        ("health", "weight_kg", 75.9, 0.83, "Weight trending to 75.9 kg in 30 days."),
        ("health", "workouts_per_week", 3.4, 0.71, "Adherence is holding near 3.4 sessions/week."),
        ("career", "skills_at_proficient", 7.0, 0.55, "Two skills should reach proficient this quarter."),
    ]:
        s.add(Forecast(user_id=uid, domain=domain, metric=metric, target_date=days_ago(-30),
                       predicted_value=value, confidence=conf, ai_insight=insight))

    s.add_all([
        AutomationRule(user_id=uid, template_key="bill_reminder_3d", enabled=True, params={}),
        AutomationRule(user_id=uid, template_key="budget_80_push", enabled=True, params={}),
        AutomationRule(user_id=uid, template_key="streak_save_evening", enabled=True, params={}),
        AutomationRule(user_id=uid, template_key="weekly_review_sunday", enabled=True, params={}),
        AutomationRule(user_id=uid, template_key="payday_snapshot", enabled=False, params={}),
        AutomationRule(user_id=uid, template_key="idle_goal_nudge_7d", enabled=False, params={}),
    ])

    s.add(BriefingPreference(user_id=uid, enabled=True, deliver_at=time(6, 30),
                             channels=["push", "in_app"], tz="Asia/Kolkata"))
    for d in range(6):
        s.add(Briefing(
            user_id=uid, date=days_ago(d),
            content_md=f"**{days_ago(d):%A}** — Yesterday you spent ₹{RNG.randint(900, 4200):,} "
                       f"across {RNG.randint(2, 5)} transactions and logged "
                       f"{RNG.choice(['a push session', 'a pull session', 'no workout', 'a leg session'])}. "
                       f"{RNG.choice(['Rent is due in 3 days.', 'Amex statement lands tomorrow.', 'Two tasks are due today.', 'Nothing urgent on the calendar.'])}",
            facts={"spend": RNG.randint(900, 4200), "workouts": RNG.randint(0, 1)},
            created_at=NOW - timedelta(days=d),
        ))

    s.add_all([
        SavedQuote(user_id=uid, text="The best time to plant a tree was 20 years ago. The second best time is now.",
                   author="Chinese proverb", favorite=True),
        SavedQuote(user_id=uid, text="What gets measured gets managed.", author="Peter Drucker",
                   favorite=False),
        SavedQuote(user_id=uid, text="Slow is smooth and smooth is fast.", author="Unknown",
                   favorite=True),
        SavedQuote(user_id=uid, text="You do not rise to the level of your goals. You fall to the level of your systems.",
                   author="James Clear", favorite=False),
    ])

    s.add_all([
        Capture(user_id=uid, raw_text="Call the bank about the Amex limit increase", processed=False),
        Capture(user_id=uid, raw_text="Idea: weekly digest email for Ledgr firms", processed=False),
        Capture(user_id=uid, raw_text="Book dentist", processed=True),
        Capture(user_id=uid, raw_text="Read the Postgres locking docs before the interview", processed=False),
    ])

    s.add_all([
        AgentAction(user_id=uid, source_domain="finance", action_type="categorize_transaction",
                    payload={"payee": "Swiggy", "suggested_category": "Restaurants"},
                    status="pending", ai_explanation="Matches 14 prior Swiggy transactions."),
        AgentAction(user_id=uid, source_domain="health", action_type="nudge",
                    payload={"message": "You're 1 session short of your weekly target."},
                    status="pending", ai_explanation="3 of 4 sessions logged with 2 days left."),
        AgentAction(user_id=uid, source_domain="finance", action_type="flag_anomaly",
                    payload={"amount": 12400, "merchant": "Croma"}, status="approved",
                    ai_explanation="3.2x your median Shopping transaction."),
    ])

    s.add(KnowledgeSource(user_id=uid, source_type="notion", enabled=False,
                          config={"workspace": "Personal"}, sync_interval_minutes=60,
                          last_status="never_synced"))


# ── Driver ────────────────────────────────────────────────────────────────────

async def main(email: str, keep: bool, list_only: bool):
    # expire_on_commit=False is load-bearing: the seeders hold ORM objects
    # (categories, accounts, goals) across commits and read `.id` / `.name`
    # afterwards. With the default True, commit expires every attribute and the
    # next attribute access tries to lazy-refresh — synchronous IO inside async
    # code, which surfaces as `MissingGreenlet` rather than anything readable.
    async with AsyncSession(engine, expire_on_commit=False) as s:
        users = (await s.execute(select(User).order_by(User.created_at))).scalars().all()
        if list_only:
            print(f"{len(users)} user(s):")
            for u in users:
                print(f"  {u.email:34} admin={bool(u.is_admin)!s:5} verified={bool(u.email_verified)!s:5} {u.id}")
            return

        user = next((u for u in users if u.email.lower() == email.lower()), None)
        if not user:
            print(f"No user with email {email!r}.\nAvailable:", file=sys.stderr)
            for u in users:
                print(f"  {u.email}", file=sys.stderr)
            sys.exit(1)

        uid = user.id
        print(f"Seeding {user.email} ({uid})")

        existing = {
            r[0] for r in (await s.execute(
                text("SELECT tablename FROM pg_tables WHERE schemaname='public'")
            )).all()
        }

        if not keep:
            removed = await wipe(s, uid, existing)
            print(f"  wiped {removed} existing seeded row(s)")

        cats = await ensure_categories(s, uid)
        print(f"  categories ready ({sum(len(v[1]) + 1 for v in cats['expense'].values())} expense, "
              f"{sum(len(v[1]) + 1 for v in cats['income'].values())} income)")

        await seed_finance(s, uid, cats)
        await s.commit()
        print("  finance   ✓")

        await seed_health(s, uid)
        await s.commit()
        print("  health    ✓")

        await seed_career(s, uid)
        await s.commit()
        print("  career    ✓")

        await seed_workspace(s, uid)
        await s.commit()
        print("  workspace ✓")

        await seed_assistant_and_insights(s, uid)
        await s.commit()
        print("  assistant, insights, automations ✓")

        counts = []
        for t in sorted(SEEDED_TABLES):
            if t not in existing:
                continue
            tbl = SQLModel.metadata.tables.get(t)
            if tbl is None or "user_id" not in tbl.columns:
                continue
            n = (await s.execute(
                text(f'SELECT count(*) FROM "{t}" WHERE user_id = :uid'), {"uid": str(uid)}
            )).scalar_one()
            if n:
                counts.append((t, n))
        total = sum(n for _, n in counts)
        print(f"\n{total} rows across {len(counts)} tables:")
        for t, n in sorted(counts, key=lambda x: -x[1]):
            print(f"  {n:>6}  {t}")


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--email", default="demo@aios.dev", help="user to seed (default: demo@aios.dev)")
    p.add_argument("--keep", action="store_true", help="add data without wiping existing seeded rows")
    p.add_argument("--list", action="store_true", dest="list_only", help="list users and exit")
    a = p.parse_args()
    asyncio.run(main(a.email, a.keep, a.list_only))
