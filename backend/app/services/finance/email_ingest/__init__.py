"""Finance OS email ingestion — deterministic bank/CC alert parsing → review queue.

Public surface:
    parse_email(subject, body, from_addr) -> ParsedTxn | ParsedCCBill | None
        Dispatches to the matching bank parser by sender. Returns None when no
        parser recognises the email (the runner then falls back to the LLM tracker).
"""
from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.senders import match_sender, parse_email

__all__ = ["ParsedTxn", "ParsedCCBill", "parse_email", "match_sender"]
