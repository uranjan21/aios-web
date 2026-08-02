"""Money-weighted return (XIRR) over irregularly dated cashflows.

The finance canvas asks investments for XIRR. A simple
`(current - invested) / invested` cannot answer it: two portfolios with the
same absolute gain but different contribution timing have very different
annualised returns, and that difference is the whole point of the number.

Solved by bisection rather than Newton-Raphson. Newton converges faster but
diverges on the cashflow shapes real portfolios produce (a large late
contribution makes the derivative flip sign), and a wrong-but-confident rate is
worse here than a slower correct one. Bisection over a bracketed range cannot
diverge; if no sign change exists in the range the answer is reported as
undefined rather than guessed.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Iterable, Optional, Sequence

# Search range for the annual rate: -99.9% (near-total loss) to +1000%.
# Beyond either end the number stops being informative anyway.
_LOW = -0.999
_HIGH = 10.0
_MAX_ITER = 200
_TOLERANCE = 1e-7

Cashflow = tuple[date, float]


def _as_date(value: date | datetime) -> date:
    return value.date() if isinstance(value, datetime) else value


def _npv(rate: float, flows: Sequence[Cashflow], t0: date) -> float:
    """Net present value of `flows` at `rate`, discounted from `t0`."""
    total = 0.0
    for when, amount in flows:
        years = (when - t0).days / 365.0
        # (1 + rate) is guaranteed > 0 by the bracket, so this cannot blow up.
        total += amount / ((1.0 + rate) ** years)
    return total


def xirr(flows: Iterable[Cashflow]) -> Optional[float]:
    """Annualised money-weighted return as a decimal (0.12 = 12%).

    `flows` are (date, amount) with the sign convention: money *out* of your
    pocket is negative (a buy), money *in* is positive (a sell, a dividend, and
    the closing valuation). Returns None when the rate is not defined — fewer
    than two flows, all flows the same sign, or no root in the search range.
    """
    normalised = sorted(((_as_date(w), float(a)) for w, a in flows), key=lambda f: f[0])
    if len(normalised) < 2:
        return None

    # A rate only exists if money went both directions. All-negative or
    # all-positive flows have no break-even discount rate.
    has_negative = any(a < 0 for _, a in normalised)
    has_positive = any(a > 0 for _, a in normalised)
    if not (has_negative and has_positive):
        return None

    t0 = normalised[0][0]
    low, high = _LOW, _HIGH
    npv_low = _npv(low, normalised, t0)
    npv_high = _npv(high, normalised, t0)

    # No sign change means no root in range — report undefined rather than
    # returning a bracket endpoint that would render as a plausible number.
    if npv_low * npv_high > 0:
        return None

    for _ in range(_MAX_ITER):
        mid = (low + high) / 2.0
        npv_mid = _npv(mid, normalised, t0)
        if abs(npv_mid) < _TOLERANCE or (high - low) < _TOLERANCE:
            return mid
        if npv_low * npv_mid < 0:
            high = mid
        else:
            low, npv_low = mid, npv_mid

    return (low + high) / 2.0


def portfolio_xirr(
    transactions: Sequence[tuple[date | datetime, str, float]],
    current_value: float,
    as_of: date,
) -> Optional[float]:
    """XIRR for a holding (or a whole portfolio) still open at `as_of`.

    `transactions` are (when, kind, amount) with kind in {buy, sell, dividend}.
    The open position is closed off with a synthetic positive flow equal to
    `current_value` on `as_of` — without it every still-held investment would
    look like a total loss.
    """
    flows: list[Cashflow] = []
    for when, kind, amount in transactions:
        magnitude = abs(float(amount))
        # A buy is money leaving the pocket; sells and dividends return it.
        flows.append((_as_date(when), -magnitude if kind == "buy" else magnitude))

    if current_value:
        flows.append((as_of, float(current_value)))

    return xirr(flows)
