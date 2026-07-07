"""Gmail read-only sync — recent message metadata + snippets for briefings,
inbox triage, and the get_recent_emails chat tool. Never sends or modifies mail.
"""
import asyncio
import logging
import uuid
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy import delete as sa_delete
from sqlmodel import select

from app.models.google_sync import GmailMessage
from app.services.integrations.google_oauth import get_valid_access_token

logger = logging.getLogger(__name__)

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"
MAX_MESSAGES_PER_SYNC = 50
RETENTION_DAYS = 30


async def sync_messages(user_id: uuid.UUID, db) -> int:
    """Fetch the last 7 days of inbox metadata and upsert. Returns messages synced."""
    token = await get_valid_access_token(user_id, db, "gmail")
    if not token:
        raise ValueError("Gmail is not connected")

    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GMAIL_API}/messages",
            headers=headers,
            params={"maxResults": MAX_MESSAGES_PER_SYNC, "q": "newer_than:7d in:inbox"},
        )
        resp.raise_for_status()
        ids = [m["id"] for m in resp.json().get("messages", [])]

        sem = asyncio.Semaphore(5)

        async def _fetch(mid: str) -> dict | None:
            async with sem:
                try:
                    r = await client.get(
                        f"{GMAIL_API}/messages/{mid}",
                        headers=headers,
                        params={
                            "format": "metadata",
                            "metadataHeaders": ["Subject", "From", "Date"],
                        },
                    )
                    r.raise_for_status()
                    return r.json()
                except Exception as e:
                    logger.warning("Gmail message %s fetch failed: %s", mid, e)
                    return None

        messages = [m for m in await asyncio.gather(*(_fetch(i) for i in ids)) if m]

    existing = {
        m.gmail_id: m
        for m in (await db.execute(
            select(GmailMessage).where(GmailMessage.user_id == user_id)
        )).scalars().all()
    }

    now = datetime.now(timezone.utc)
    count = 0
    for msg in messages:
        hdrs = {
            h["name"].lower(): h["value"]
            for h in (msg.get("payload", {}).get("headers") or [])
        }
        received = None
        if msg.get("internalDate"):
            received = datetime.fromtimestamp(int(msg["internalDate"]) / 1000, tz=timezone.utc).replace(tzinfo=None)
        is_unread = "UNREAD" in (msg.get("labelIds") or [])

        row = existing.get(msg["id"])
        if row:
            row.is_unread = is_unread
            row.snippet = msg.get("snippet", row.snippet)
            row.updated_at = now
        else:
            row = GmailMessage(
                user_id=user_id,
                gmail_id=msg["id"],
                thread_id=msg.get("threadId"),
                subject=hdrs.get("subject", "(no subject)"),
                sender=hdrs.get("from", ""),
                snippet=msg.get("snippet", ""),
                received_at=received,
                is_unread=is_unread,
            )
        db.add(row)
        count += 1

    # Prune old rows so the table stays a rolling window, not an archive.
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    await db.execute(
        sa_delete(GmailMessage)
        .where(GmailMessage.user_id == user_id)
        .where(GmailMessage.received_at < cutoff)
    )
    await db.commit()
    return count


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
