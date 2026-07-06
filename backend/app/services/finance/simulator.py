"""Finance What-If Simulator (plan §7 extension, shipped 2026-07-04).

Monte-Carlo projection of liquid balance over 6–24 months, seeded from the
user's REAL history: current account balances, average monthly income and the
mean/std of monthly spend over the trailing 90 days. Levers let the user ask
"what if spending drops 20%?" / "what if income rises 10%?" / "what about a
one-time ₹X hit in month N?".

Deterministic + stochastic paths, pure Python (no numpy): 400 runs × ≤24
months is trivial. All inputs are the user's own rows — no LLM, no metering.
"""

import logging
import random
import statistics
import uuid
import datetime as dt

from sqlmodel import select

from app.models.finance import Account, FinanceExpense, FinanceIncome

logger = logging.getLogger(__name__)

RUNS = 400
LOOKBACK_DAYS = 90


async def gather_baseline(session, user_id: uuid.UUID) -> dict:
    accounts = (await session.execute(
        select(Account).where(Account.user_id == user_id)
    )).scalars().all()
    start_balance = float(sum(a.balance or 0 for a in accounts))

    start = dt.datetime.utcnow() - dt.timedelta(days=LOOKBACK_DAYS)
    expenses = (await session.execute(
        select(FinanceExpense).where(
            FinanceExpense.user_id == user_id, FinanceExpense.logged_at >= start
        )
    )).scalars().all()
    incomes = (await session.execute(
        select(FinanceIncome).where(
            FinanceIncome.user_id == user_id, FinanceIncome.logged_at >= start
        )
    )).scalars().all()

    # Monthly spend distribution from 30-day buckets of the trailing 90 days.
    buckets = [0.0, 0.0, 0.0]
    now = dt.datetime.utcnow()
    for e in expenses:
        age = (now - e.logged_at).days
        idx = min(age // 30, 2)
        buckets[idx] += float(e.amount)
    nonzero = [b for b in buckets if b > 0]
    spend_mean = statistics.mean(nonzero) if nonzero else 0.0
    spend_std = statistics.stdev(nonzero) if len(nonzero) >= 2 else spend_mean * 0.25

    income_monthly = sum(float(i.amount) for i in incomes) / (LOOKBACK_DAYS / 30)

    return {
        "start_balance": round(start_balance, 2),
        "monthly_income": round(income_monthly, 2),
        "monthly_spend_mean": round(spend_mean, 2),
        "monthly_spend_std": round(spend_std, 2),
        "data_months": len(nonzero),
    }


def run_simulation(
    baseline: dict,
    months: int,
    income_delta_pct: float,
    spend_delta_pct: float,
    one_time_amount: float = 0.0,
    one_time_month: int = 1,
) -> dict:
    income = baseline["monthly_income"] * (1 + income_delta_pct / 100)
    spend_mean = baseline["monthly_spend_mean"] * (1 + spend_delta_pct / 100)
    spend_std = baseline["monthly_spend_std"] * (1 + spend_delta_pct / 100)
    start = baseline["start_balance"]

    # Deterministic path
    deterministic = []
    bal = start
    for m in range(1, months + 1):
        bal += income - spend_mean
        if m == one_time_month:
            bal -= one_time_amount
        deterministic.append(round(bal, 2))

    # Monte Carlo paths
    rng = random.Random(42)  # stable seed → stable bands for identical inputs
    endpoints: list[list[float]] = [[] for _ in range(months)]
    for _ in range(RUNS):
        bal = start
        for m in range(1, months + 1):
            monthly_spend = max(0.0, rng.gauss(spend_mean, spend_std))
            bal += income - monthly_spend
            if m == one_time_month:
                bal -= one_time_amount
            endpoints[m - 1].append(bal)

    def pct(values: list[float], p: float) -> float:
        s = sorted(values)
        k = min(len(s) - 1, max(0, int(round(p * (len(s) - 1)))))
        return round(s[k], 2)

    p10 = [pct(col, 0.10) for col in endpoints]
    p50 = [pct(col, 0.50) for col in endpoints]
    p90 = [pct(col, 0.90) for col in endpoints]

    # First month where the median path goes negative (None = never)
    zero_month = next((i + 1 for i, v in enumerate(p50) if v < 0), None)

    today = dt.date.today()
    labels = []
    y, mo = today.year, today.month
    for _ in range(months):
        mo += 1
        if mo > 12:
            mo = 1
            y += 1
        labels.append(f"{y}-{mo:02d}")

    return {
        "labels": labels,
        "deterministic": deterministic,
        "p10": p10,
        "p50": p50,
        "p90": p90,
        "zero_month": zero_month,
        "assumptions": baseline,
    }
