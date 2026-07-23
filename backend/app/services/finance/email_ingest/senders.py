"""Bank-sender allowlist + parser dispatch.

Only emails from these senders are fetched (data minimisation — we never pull the full body of
arbitrary mail) and dispatched to the matching parser. Add a bank by registering its domains here.
"""
from __future__ import annotations

from typing import Callable, Optional, Union

from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.parsers import axis, cred, hdfc, icici, sbi

ParserFn = Callable[[str, str, str], Optional[Union[ParsedTxn, ParsedCCBill]]]

# slug -> (parser, [sender domains/substrings matched case-insensitively in the From header])
BANK_REGISTRY: dict[str, tuple[ParserFn, list[str]]] = {
    "hdfc": (hdfc.parse, ["hdfcbank.net", "hdfcbank.com"]),
    "axis": (axis.parse, ["axisbank.com"]),
    "icici": (icici.parse, ["icicibank.com"]),
    "sbi": (sbi.parse, ["sbicard.com", "sbi.co.in"]),
    "cred": (cred.parse, ["cred.club"]),
}

# Flat domain -> parser map for O(1)-ish sender matching.
_DOMAIN_MAP: dict[str, ParserFn] = {
    domain.lower(): fn for fn, domains in BANK_REGISTRY.values() for domain in domains
}

# All sender domains, for building the Gmail `from:(...)` scoping query.
SENDER_DOMAINS: list[str] = sorted(_DOMAIN_MAP.keys())


def gmail_from_query() -> str:
    """Gmail search fragment restricting the fetch to known bank senders."""
    return "from:(" + " OR ".join(SENDER_DOMAINS) + ")"


def match_sender(from_addr: str) -> Optional[ParserFn]:
    """Return the parser for a From header, or None if the sender isn't a known bank."""
    if not from_addr:
        return None
    low = from_addr.lower()
    for domain, fn in _DOMAIN_MAP.items():
        if domain in low:
            return fn
    return None


def parse_email(
    subject: str, body: str, from_addr: str
) -> Optional[Union[ParsedTxn, ParsedCCBill]]:
    """Dispatch an email to its bank parser. None → unrecognised (runner falls back to LLM)."""
    fn = match_sender(from_addr)
    if fn is None:
        return None
    return fn(subject or "", body or "", from_addr or "")
