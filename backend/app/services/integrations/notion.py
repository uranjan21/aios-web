"""Notion OAuth + read-only client. Pages are mirrored into the vault store
(vault_files path `notion/<page_id>.md`) so chat + agents can RAG-search them.
"""
import asyncio
import base64
import logging
import uuid
from datetime import datetime, timezone
from typing import Optional

import httpx
from sqlmodel import select

from app.core.config import get_settings
from app.core.security import encrypt_token, decrypt_token
from app.models.integration import IntegrationCredential

logger = logging.getLogger(__name__)

NOTION_TOKEN_URL = "https://api.notion.com/v1/oauth/token"
NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"

MAX_PAGES_PER_SYNC = 30
MAX_BLOCK_BATCHES_PER_PAGE = 3  # 100 blocks per batch


async def exchange_code(code: str) -> dict:
    settings = get_settings()
    if not settings.notion_client_id or not settings.notion_client_secret:
        raise ValueError("NOTION_CLIENT_ID / NOTION_CLIENT_SECRET are not configured")
    redirect_uri = f"{settings.allowed_origin}/integrations/notion/callback"
    basic = base64.b64encode(
        f"{settings.notion_client_id}:{settings.notion_client_secret}".encode()
    ).decode()

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            NOTION_TOKEN_URL,
            headers={"Authorization": f"Basic {basic}"},
            json={"grant_type": "authorization_code", "code": code, "redirect_uri": redirect_uri},
        )
        resp.raise_for_status()
        data = resp.json()

    return {
        "access_token": data["access_token"],
        "workspace_name": data.get("workspace_name", ""),
        "workspace_id": data.get("workspace_id", ""),
    }


async def save_tokens(user_id: uuid.UUID, db, token_data: dict) -> IntegrationCredential:
    """Notion tokens don't expire and have no refresh token."""
    result = await db.execute(
        select(IntegrationCredential)
        .where(IntegrationCredential.user_id == user_id)
        .where(IntegrationCredential.provider == "notion")
    )
    cred = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)
    meta = {"workspace_name": token_data.get("workspace_name", ""), "workspace_id": token_data.get("workspace_id", "")}

    if not cred:
        cred = IntegrationCredential(
            user_id=user_id,
            provider="notion",
            access_token_encrypted=encrypt_token(token_data["access_token"]),
            status="connected",
            metadata_=meta,
            created_at=now,
            updated_at=now,
        )
    else:
        cred.access_token_encrypted = encrypt_token(token_data["access_token"])
        cred.refresh_token_encrypted = None
        cred.token_expires_at = None
        cred.status = "connected"
        cred.metadata_ = meta
        cred.updated_at = now

    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


async def _get_token(user_id: uuid.UUID) -> Optional[str]:
    from app.db.session import AsyncSessionLocal
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(IntegrationCredential)
            .where(IntegrationCredential.user_id == user_id)
            .where(IntegrationCredential.provider == "notion")
        )
        cred = result.scalar_one_or_none()
    if not cred or cred.status != "connected" or not cred.access_token_encrypted:
        return None
    return decrypt_token(cred.access_token_encrypted)


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Notion-Version": NOTION_VERSION}


def _page_title(page: dict) -> str:
    for prop in (page.get("properties") or {}).values():
        if prop.get("type") == "title":
            return "".join(t.get("plain_text", "") for t in prop.get("title", [])) or "(untitled)"
    return "(untitled)"


def _block_to_text(block: dict) -> str:
    btype = block.get("type", "")
    payload = block.get(btype) or {}
    rich = payload.get("rich_text")
    if rich is None:
        if btype == "child_page":
            return f"## {payload.get('title', '')}"
        return ""
    text = "".join(t.get("plain_text", "") for t in rich)
    if not text:
        return ""
    if btype == "heading_1":
        return f"# {text}"
    if btype == "heading_2":
        return f"## {text}"
    if btype == "heading_3":
        return f"### {text}"
    if btype in ("bulleted_list_item", "numbered_list_item"):
        return f"- {text}"
    if btype == "to_do":
        checked = "x" if payload.get("checked") else " "
        return f"- [{checked}] {text}"
    if btype == "quote":
        return f"> {text}"
    if btype == "code":
        return f"```\n{text}\n```"
    return text


async def search_pages(token: str, query: str = "", limit: int = MAX_PAGES_PER_SYNC) -> list[dict]:
    """Return [{id, title, last_edited}] for pages shared with the integration."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{NOTION_API}/search",
            headers=_headers(token),
            json={
                "query": query,
                "filter": {"property": "object", "value": "page"},
                "page_size": min(limit, 100),
            },
        )
        resp.raise_for_status()
        results = resp.json().get("results", [])

    return [
        {"id": p["id"], "title": _page_title(p), "last_edited": p.get("last_edited_time")}
        for p in results[:limit]
    ]


async def fetch_page_text(token: str, page_id: str) -> str:
    lines: list[str] = []
    cursor = None
    async with httpx.AsyncClient(timeout=30) as client:
        for _ in range(MAX_BLOCK_BATCHES_PER_PAGE):
            params = {"page_size": 100}
            if cursor:
                params["start_cursor"] = cursor
            resp = await client.get(
                f"{NOTION_API}/blocks/{page_id}/children", headers=_headers(token), params=params
            )
            resp.raise_for_status()
            data = resp.json()
            for block in data.get("results", []):
                line = _block_to_text(block)
                if line:
                    lines.append(line)
            if not data.get("has_more"):
                break
            cursor = data.get("next_cursor")
    return "\n".join(lines)


async def get_page_by_title(user_id: uuid.UUID, title: str) -> str:
    """Chat-tool entry: find the best-matching page by title and return its text."""
    token = await _get_token(user_id)
    if not token:
        return "(Notion integration not connected. Connect Notion in the Integrations page to enable this.)"
    pages = await search_pages(token, query=title, limit=5)
    if not pages:
        return f"(No Notion page found matching '{title}')"
    page = pages[0]
    text = await fetch_page_text(token, page["id"])
    return f"# {page['title']}\n\n{text}" if text else f"# {page['title']}\n\n(page is empty)"


async def sync_pages(user_id: uuid.UUID) -> int:
    """Mirror the integration's shared pages into the vault store. Returns pages synced."""
    from app.services.vault_sync.sync_engine import upsert_external_doc

    token = await _get_token(user_id)
    if not token:
        raise ValueError("Notion is not connected")

    pages = await search_pages(token)
    sem = asyncio.Semaphore(4)
    count = 0

    async def _pull_one(page: dict) -> None:
        nonlocal count
        async with sem:
            try:
                text = await fetch_page_text(token, page["id"])
            except Exception as e:
                logger.warning("Notion page %s fetch failed: %s", page["id"], e)
                return
        content = f"# {page['title']}\n\n{text}"
        await upsert_external_doc(user_id, f"notion/{page['id']}.md", content, file_type="note")
        count += 1

    await asyncio.gather(*(_pull_one(p) for p in pages))
    return count
