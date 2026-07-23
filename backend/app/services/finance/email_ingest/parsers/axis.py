"""Axis Bank alerts — cards, UPI, and statement summaries. Verify regexes against real
samples (base extraction is shared; add Axis-specific overrides here if templates differ).
"""
from __future__ import annotations

from typing import Optional, Union

from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.parsers import generic

SLUG = "axis"
CARD_NAME = "Axis Credit Card"


def parse(subject: str, body: str, from_addr: str) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    return generic.parse_bank_email(subject, body, SLUG, CARD_NAME)
