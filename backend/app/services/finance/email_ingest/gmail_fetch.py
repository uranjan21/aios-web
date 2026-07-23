"""Fetch full email bodies for known bank senders only (data minimisation).

Reuses the existing read-only Gmail OAuth token. Never sends or modifies mail.
Returns lightweight dicts the runner can parse; nothing is persisted here.
"""
from __future__ import annotations

import base64
import logging
import re
from typing import Optional

import httpx

from app.services.finance.email_ingest.senders import gmail_from_query
from app.services.integrations.google_oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
MAX_MESSAGES = 60
_HTML_TAG_RE = re.compile(r"<[^>]+>")


def _b64url_decode(data: str) -> str:
    if not data:
        return ""
    try:
        return base64.urlsafe_b64decode(data.encode("utf-8")).decode("utf-8", "replace")
    except Exception:  # pragma: no cover - defensive
        return ""


def _extract_body(payload: dict) -> str:
    """Walk the MIME tree and return decoded text, preferring text/plain over stripped HTML."""
    plain: list[str] = []
    html: list[str] = []

    def walk(part: dict) -> None:
        mime = part.get("mimeType", "")
        body = part.get("body", {})
        data = body.get("data")
        if data:
            decoded = _b64url_decode(data)
            if mime == "text/plain":
                plain.append(decoded)
            elif mime == "text/html":
                html.append(decoded)
        for sub in part.get("parts", []) or []:
            walk(sub)

    walk(payload)
    if plain:
        return "\n".join(plain)
    if html:
        return _HTML_TAG_RE.sub(" ", "\n".join(html))
    return ""


async def fetch_bank_emails(user_id, db, newer_than_days: int = 3) -> list[dict]:
    """Return recent bank-sender emails as {id, from, subject, body, internal_date}.

    Scoped by sender allowlist + a short recency window so we never pull arbitrary mail.
    Best-effort per message: a fetch failure logs and is skipped, not fatal.
    """
    token = await get_valid_access_token(user_id, db, "gmail")
    if not token:
        raise ValueError("Gmail is not connected")

    query = f"newer_than:{newer_than_days}d {gmail_from_query()}"
    headers = {"Authorization": f"Bearer {token}"}
    out: list[dict] = []

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GMAIL_API}/messages",
            headers=headers,
            params={"maxResults": MAX_MESSAGES, "q": query},
        )
        resp.raise_for_status()
        ids = [m["id"] for m in resp.json().get("messages", [])]

        for mid in ids:
            try:
                r = await client.get(
                    f"{GMAIL_API}/messages/{mid}",
                    headers=headers,
                    params={"format": "full"},
                )
                r.raise_for_status()
                msg = r.json()
            except Exception as e:  # best-effort per message
                logger.warning("Gmail full fetch failed for %s: %s", mid, e)
                continue

            payload = msg.get("payload", {})
            hdrs = {
                h["name"].lower(): h["value"]
                for h in (payload.get("headers") or [])
            }
            internal = msg.get("internalDate")
            out.append(
                {
                    "id": msg["id"],
                    "from": hdrs.get("from", ""),
                    "subject": hdrs.get("subject", ""),
                    "body": _extract_body(payload),
                    "internal_date": int(internal) if internal else None,
                }
            )
    return out
