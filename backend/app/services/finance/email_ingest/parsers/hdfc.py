"""HDFC Bank alerts — CC spends ("A payment was made using your Credit Card"),
UPI txns ("You have done a UPI txn"), and CC statement summaries.
"""
from __future__ import annotations

from typing import Optional, Union

from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.parsers import generic

SLUG = "hdfc"
CARD_NAME = "HDFC Credit Card"


def parse(subject: str, body: str, from_addr: str) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    return generic.parse_bank_email(subject, body, SLUG, CARD_NAME)
