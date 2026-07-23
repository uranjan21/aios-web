"""Gmail read-only sync — recent message metadata + snippets for briefings,
inbox triage, and the get_recent_emails chat tool. Never sends or modifies mail.

Two sweeps per linked account:
- General: last 7 days of inbox METADATA (subject/from/date + snippet) — feeds
  the morning brief and chat email tools, unchanged behavior.
- Financial: a targeted query over curated bank/UPI senders + subject keywords
  (services/finance/email_sources.py) fetched with format=full so the
  transaction-extraction agent can read amounts/refs from the BODY. Only these
  messages get body_text stored; rows are tagged is_financial for the agent.

A user may have several linked Gmail accounts (bank alerts often arrive in a
different inbox than the sign-in account) — every connected account is synced
and rows carry account_email attribution.
"""
import asyncio
import base64
import html as html_mod
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import delete as sa_delete, not_, or_
from sqlmodel import select

from app.models.google_sync import GmailMessage
from app.services.integrations.google_oauth import (
    get_valid_access_token,
    list_provider_credentials,
)
from app.services.finance.email_sources import financial_gmail_query

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
MAX_MESSAGES_PER_SYNC = 50
RETENTION_DAYS = 30
MAX_BODY_CHARS = 20000


async def sync_messages(user_id: uuid.UUID, db) -> int:
    """Sync every connected Gmail account for the user. Returns messages synced."""
    creds = [
        c for c in await list_provider_credentials(user_id, db, "gmail")
        if c.status == "connected"
    ]
    if not creds:
        raise ValueError("Gmail is not connected")

    total = 0
    for cred in creds:
        try:
            total += await _sync_account(user_id, db, cred.account_email)
        except Exception:
            logger.exception("Gmail sync failed for account %r", cred.account_email)

    # Prune old rows so the table stays a rolling window, not an archive.
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    await db.execute(
        sa_delete(GmailMessage)
        .where(GmailMessage.user_id == user_id)
        .where(GmailMessage.received_at < cutoff)
    )
    await db.commit()
    return total


async def _sync_account(user_id: uuid.UUID, db, account_email: str) -> int:
    token = await get_valid_access_token(user_id, db, "gmail", account_email=account_email)
    if not token:
        return 0

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30) as client:

        async def _list_ids(q: str) -> list[str]:
            resp = await client.get(
                f"{GMAIL_API}/messages",
                headers=headers,
                params={"maxResults": MAX_MESSAGES_PER_SYNC, "q": q},
            )
            resp.raise_for_status()
            return [m["id"] for m in resp.json().get("messages", [])]

        general_ids = await _list_ids("newer_than:7d in:inbox")
        financial_ids = await _list_ids(financial_gmail_query())
        financial_set = set(financial_ids)

        sem = asyncio.Semaphore(5)

        async def _fetch(mid: str, full: bool) -> dict | None:
            params = (
                {"format": "full"}
                if full
                else {"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]}
            )
            async with sem:
                try:
                    r = await client.get(f"{GMAIL_API}/messages/{mid}", headers=headers, params=params)
                    r.raise_for_status()
                    return r.json()
                except Exception as e:
                    logger.warning("Gmail message %s fetch failed: %s", mid, e)
                    return None

        meta_msgs = [
            m for m in await asyncio.gather(
                *(_fetch(i, full=False) for i in general_ids if i not in financial_set)
            ) if m
        ]
        full_msgs = [
            m for m in await asyncio.gather(*(_fetch(i, full=True) for i in financial_ids)) if m
        ]

    existing = {
        m.gmail_id: m
        for m in (await db.execute(
            select(GmailMessage)
            .where(GmailMessage.user_id == user_id)
            .where(GmailMessage.account_email == account_email)
        )).scalars().all()
    }

    now = datetime.utcnow()  # naive UTC — gmail_messages columns are tz-naive
    count = 0
    for msg, is_financial in [(m, False) for m in meta_msgs] + [(m, True) for m in full_msgs]:
        hdrs = {
            h["name"].lower(): h["value"]
            for h in (msg.get("payload", {}).get("headers") or [])
        }
        received = None
        if msg.get("internalDate"):
            received = datetime.fromtimestamp(int(msg["internalDate"]) / 1000, tz=timezone.utc).replace(tzinfo=None)
        is_unread = "UNREAD" in (msg.get("labelIds") or [])
        body = _extract_body(msg) if is_financial else None

        row = existing.get(msg["id"])
        if row:
            row.is_unread = is_unread
            row.snippet = msg.get("snippet", row.snippet)
            if is_financial:
                row.is_financial = True
                if body and not row.body_text:
                    row.body_text = body
            row.updated_at = now
        else:
            row = GmailMessage(
                user_id=user_id,
                account_email=account_email,
                gmail_id=msg["id"],
                thread_id=msg.get("threadId"),
                subject=hdrs.get("subject", "(no subject)"),
                sender=hdrs.get("from", ""),
                snippet=msg.get("snippet", ""),
                body_text=body,
                is_financial=is_financial,
                received_at=received,
                is_unread=is_unread,
            )
        db.add(row)
        count += 1

    await db.commit()
    return count


def _extract_body(msg: dict) -> str | None:
    """Pull readable text from a format=full Gmail payload: prefer text/plain
    parts, fall back to tag-stripped text/html. Capped at MAX_BODY_CHARS."""
    plain: list[str] = []
    html_parts: list[str] = []

    def _walk(part: dict) -> None:
        mime = part.get("mimeType", "")
        data = (part.get("body") or {}).get("data")
        if data:
            if mime == "text/plain":
                plain.append(data)
            elif mime == "text/html":
                html_parts.append(data)
        for child in part.get("parts") or []:
            _walk(child)

    _walk(msg.get("payload", {}))

    def _decode(chunks: list[str]) -> str:
        out = []
        for data in chunks:
            try:
                out.append(base64.urlsafe_b64decode(data + "===").decode("utf-8", "replace"))
            except Exception:
                continue
        return "\n".join(out)

    text = _decode(plain) or _strip_html(_decode(html_parts))
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text[:MAX_BODY_CHARS] or None


def _strip_html(raw: str) -> str:
    if not raw:
        return ""
    raw = re.sub(r"<(style|script)[^>]*>.*?</\1>", " ", raw, flags=re.S | re.I)
    text = re.sub(r"<[^>]+>", " ", raw)
    text = html_mod.unescape(text)
    return re.sub(r"[ \t]+", " ", text)


async def get_stored_messages(
    user_id: uuid.UUID, db, limit: int = 20, unread_only: bool = False
) -> list[dict]:
    query = (
        select(GmailMessage)
        .where(GmailMessage.user_id == user_id)
        .order_by(GmailMessage.received_at.desc())
        .limit(min(limit, 50))
    )
    if unread_only:
        query = query.where(GmailMessage.is_unread == True)  # noqa: E712
    rows = (await db.execute(query)).scalars().all()
    return [
        {
            "subject": r.subject,
            "sender": r.sender,
            "snippet": r.snippet,
            "received_at": r.received_at.isoformat() if r.received_at else None,
            "is_unread": r.is_unread,
        }
        for r in rows
    ]


def _statement_filter(want_statement: bool):
    """Statement emails (periodic summaries) vs per-transaction alerts."""
    ilike = GmailMessage.subject.ilike("%statement%")
    if want_statement:
        return ilike
    return or_(GmailMessage.subject.is_(None), not_(ilike))


async def get_unextracted_financial(
    user_id: uuid.UUID, db, limit: int, statement: bool
) -> list[GmailMessage]:
    """Financial messages the extraction agent hasn't processed yet, oldest first."""
    query = (
        select(GmailMessage)
        .where(GmailMessage.user_id == user_id)
        .where(GmailMessage.is_financial == True)  # noqa: E712
        .where(GmailMessage.extracted_at.is_(None))
        .where(_statement_filter(statement))
        .order_by(GmailMessage.received_at.asc())
        .limit(limit)
    )
    return list((await db.execute(query)).scalars().all())
