"""CRED bill summaries — CC bill reminders that CRED aggregates across cards.

CRED's shape differs from bank statement emails ("your <Bank> credit card bill of Rs.X is due on
DATE"), so it has a dedicated statement regex, then falls back to the generic bank extraction.
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
from app.services.finance.email_ingest.parsers import generic

SLUG = "cred"

_BILL_RE = re.compile(
    r"(?:([\w ]+?)\s+)?(?:credit\s+card\s+)?bill\s+of\s+(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d{1,2})?)"
    r".*?due\s+(?:on|by)\s+(\d{1,2}[-/\s][\w]{2,}(?:[-/\s]\d{2,4})?)",
    re.IGNORECASE,
)


def parse(subject: str, body: str, from_addr: str) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    text = normalize(f"{subject} {body}")
    m = _BILL_RE.search(text)
    if m:
        total_due = parse_amount(m.group(2))
        if total_due is not None:
            card_name = (m.group(1) or "").strip() or "Credit Card"
            return ParsedCCBill(
                total_due=total_due,
                due_date=parse_datetime(m.group(3)),
                card_name=card_name,
                parser=SLUG,
            )
    return generic.parse_bank_email(subject, body, SLUG, "Credit Card")
