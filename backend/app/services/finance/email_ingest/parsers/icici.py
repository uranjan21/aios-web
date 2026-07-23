"""ICICI Bank alerts — cards, UPI, and statement summaries. Verify against real samples."""
from __future__ import annotations

from typing import Optional, Union

from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.parsers import generic

SLUG = "icici"
CARD_NAME = "ICICI Credit Card"


def parse(subject: str, body: str, from_addr: str) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    return generic.parse_bank_email(subject, body, SLUG, CARD_NAME)
