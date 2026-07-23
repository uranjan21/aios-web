"""Shared Indian-bank-alert extraction reused by the per-bank parsers.

Indian bank/CC alert emails share a strong common shape ("Rs.X debited ... at MERCHANT on DATE",
"Total Amount Due ... Payment Due Date ..."), so the field extraction lives here once and each bank
file is a thin adapter that supplies its slug + display name. Bank-specific quirks override locally.
"""
from __future__ import annotations

import re
from typing import Optional, Union

from app.services.finance.email_ingest.base import (
    ParsedCCBill,
    ParsedTxn,
    normalize,
    parse_amount,
    parse_datetime,
)

_AMOUNT_RE = re.compile(r"(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE)
_LAST4_RE = re.compile(
    r"(?:card|a/?c|account)\s*(?:no\.?|number|ending(?:\s+in)?|ending|xx+|\*+)?\s*(?:xx+|\*+)?\s*(\d{4})\b",
    re.IGNORECASE,
)
_MERCHANT_AT_RE = re.compile(r"\bat\s+(.+?)\s+on\s+\d", re.IGNORECASE)
_VPA_RE = re.compile(r"\bto\s+(?:vpa\s+)?([\w.\-]+@[\w.\-]+)", re.IGNORECASE)
_TO_NAME_RE = re.compile(r"\bto\s+(.+?)\s+on\s+\d", re.IGNORECASE)
_DATETIME_RE = re.compile(
    r"\bon\s+(\d{1,2}[-/][\w]{2,}[-/]\d{2,4})(?:\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?))?",
    re.IGNORECASE,
)
_DUE_DATE_RE = re.compile(
    r"(?:payment\s+due\s+date|due\s+date)\D{0,20}?(\d{1,2}[-/][\w]{2,}[-/]\d{2,4})",
    re.IGNORECASE,
)
_TOTAL_DUE_RE = re.compile(
    r"total\s+amount\s+due\D{0,20}?(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)", re.IGNORECASE
)
_MIN_DUE_RE = re.compile(
    r"min(?:imum)?\s+amount\s+due\D{0,20}?(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)",
    re.IGNORECASE,
)

_CREDIT_WORDS = ("credited", "received", "deposited")
_DEBIT_WORDS = ("debited", "spent", "paid", "payment", "withdrawn", "purchase", "charged")
# A transaction email must carry one of these verbs (plus a sender on the allowlist). This keeps
# promo/OTP mail that merely mentions "Rs 500 cashback" from being parsed into a bogus expense.
_TXN_INDICATORS = _CREDIT_WORDS + _DEBIT_WORDS + ("upi",)


def _last4(text: str) -> Optional[str]:
    m = _LAST4_RE.search(text)
    return m.group(1) if m else None


def _when(text: str):
    m = _DATETIME_RE.search(text)
    return parse_datetime(m.group(1), m.group(2)) if m else None


def _direction(text: str) -> str:
    low = text.lower()
    if any(w in low for w in _CREDIT_WORDS) and not any(w in low for w in _DEBIT_WORDS):
        return "income"
    return "expense"


def parse_statement(text: str, slug: str, card_name: str) -> Optional[ParsedCCBill]:
    total = _TOTAL_DUE_RE.search(text)
    if not total:
        return None
    total_due = parse_amount(total.group(1))
    if total_due is None:
        return None
    min_due = _MIN_DUE_RE.search(text)
    due = _DUE_DATE_RE.search(text)
    return ParsedCCBill(
        total_due=total_due,
        min_due=parse_amount(min_due.group(1)) if min_due else None,
        due_date=parse_datetime(due.group(1)) if due else None,
        card_hint=_last4(text),
        card_name=card_name,
        parser=slug,
    )


def parse_bank_email(
    subject: str,
    body: str,
    slug: str,
    card_name: str,
) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    """Generic extraction: statement summary → CC bill, else a card/UPI transaction."""
    text = normalize(f"{subject} {body}")
    low = text.lower()

    if "total amount due" in low:
        return parse_statement(text, slug, card_name)

    if not any(w in low for w in _TXN_INDICATORS):
        return None

    amt_m = _AMOUNT_RE.search(text)
    if not amt_m:
        return None
    amount = parse_amount(amt_m.group(1))
    if amount is None:
        return None

    payee = None
    vpa = _VPA_RE.search(text)
    if vpa:
        payee = vpa.group(1)
    else:
        merch = _MERCHANT_AT_RE.search(text) or _TO_NAME_RE.search(text)
        if merch:
            payee = merch.group(1).strip(" .")

    return ParsedTxn(
        amount=amount,
        direction=_direction(text),
        payee_name=payee,
        account_hint=_last4(text),
        occurred_at=_when(text),
        parser=slug,
    )
