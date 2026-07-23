"""Parsed-result types + shared amount/date helpers for bank email parsers.

Parsers are PURE functions: (subject, body, from_addr) -> ParsedTxn | ParsedCCBill | None.
No I/O, no DB — trivially unit-testable and pinned to real email templates by tests.
The email text is DATA, never instructions; parsers only read, never eval.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Optional


@dataclass
class ParsedTxn:
    """A single debit/credit extracted from a transaction-alert email."""

    amount: Decimal
    direction: str  # "expense" (debit) | "income" (credit)
    payee_name: Optional[str] = None
    account_hint: Optional[str] = None  # card/account last 4 digits, for account mapping
    occurred_at: Optional[datetime] = None  # naive local datetime
    parser: str = ""  # bank slug that produced this (e.g. "hdfc")
    kind: str = field(default="txn", init=False)


@dataclass
class ParsedCCBill:
    """A credit-card statement summary — a payable, not a ledger line."""

    total_due: Decimal
    min_due: Optional[Decimal] = None
    unbilled: Optional[Decimal] = None
    due_date: Optional[datetime] = None
    statement_date: Optional[datetime] = None
    card_hint: Optional[str] = None  # last 4 digits
    card_name: Optional[str] = None
    parser: str = ""
    kind: str = field(default="cc_bill", init=False)


# ── Amount parsing ────────────────────────────────────────────────────────────
# Handles Indian formats: "Rs.1,234.56", "INR 1,23,456.78", "₹500", "1.2k", "2L".
_CURRENCY_RE = re.compile(r"(?:rs\.?|inr|₹)\s*", re.IGNORECASE)


def parse_amount(raw: str) -> Optional[Decimal]:
    """Parse a currency string to Decimal. Returns None if unparseable.

    Strips currency symbols and thousands separators; expands k/L/Cr suffixes.
    """
    if raw is None:
        return None
    s = _CURRENCY_RE.sub("", str(raw)).strip()
    s = s.replace(",", "").replace(" ", "")
    if not s:
        return None

    mult = Decimal(1)
    suffix = s[-1:].lower()
    if suffix == "k":
        mult, s = Decimal(1_000), s[:-1]
    elif suffix == "l":  # lakh
        mult, s = Decimal(100_000), s[:-1]
    elif s[-2:].lower() == "cr":
        mult, s = Decimal(10_000_000), s[:-2]

    try:
        value = Decimal(s) * mult
    except (InvalidOperation, ValueError):
        return None
    if value <= 0:
        return None
    return value.quantize(Decimal("0.01"))


# ── Date parsing ──────────────────────────────────────────────────────────────
_MONTHS = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}


def parse_datetime(date_str: str, time_str: Optional[str] = None) -> Optional[datetime]:
    """Parse an Indian-format date (DD-MM-YY[YY], DD/MM/YYYY, DD-Mon-YYYY) + optional
    HH:MM[:SS] time into a NAIVE datetime. Returns None if unparseable.
    """
    if not date_str:
        return None
    d = date_str.strip()

    day = month = year = None
    # DD-Mon[-YYYY] / DD Mon [YYYY] (textual month; year optional — CRED reminders omit it,
    # in which case we assume the current year, fine for a due-date reminder).
    m = re.match(r"(\d{1,2})[\-/\s]([A-Za-z]{3,})(?:[\-/\s](\d{2,4}))?", d)
    if m and _MONTHS.get(m.group(2)[:3].lower()):
        day = int(m.group(1))
        month = _MONTHS.get(m.group(2)[:3].lower())
        year = int(m.group(3)) if m.group(3) else datetime.now().year
    else:
        # DD-MM-YYYY / DD/MM/YY (numeric)
        m = re.match(r"(\d{1,2})[\-/](\d{1,2})[\-/](\d{2,4})", d)
        if m:
            day, month, year = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if not (day and month and year):
        return None
    if year < 100:
        year += 2000
    if not (1 <= month <= 12 and 1 <= day <= 31):
        return None

    hour = minute = second = 0
    if time_str:
        tm = re.match(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", time_str.strip())
        if tm:
            hour, minute = int(tm.group(1)), int(tm.group(2))
            second = int(tm.group(3)) if tm.group(3) else 0
    try:
        return datetime(year, month, day, hour, minute, second)
    except ValueError:
        return None


def normalize(text: str) -> str:
    """Collapse whitespace/newlines so multi-line email bodies match single-line regexes."""
    return re.sub(r"\s+", " ", text or "").strip()
