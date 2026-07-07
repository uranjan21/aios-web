"""Periodic pull of each user's configured knowledge base (Obsidian folder or Notion)
into the vault store, so chat + agents can search it via RAG.
"""
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path

from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.knowledge import KnowledgeSource

logger = logging.getLogger(__name__)

SKIP_DIRS = {".git", ".obsidian", ".trash", "node_modules"}
MAX_FILES_PER_PULL = 2000


async def pull_source(user_id: uuid.UUID) -> int:
    """Pull the user's knowledge source now. Returns items synced; raises ValueError
    on configuration problems. Records last_synced_at/status/error on the row."""
    async with AsyncSessionLocal() as session:
        src = (await session.execute(
            select(KnowledgeSource).where(KnowledgeSource.user_id == user_id)
        )).scalar_one_or_none()

    if not src:
        raise ValueError("No knowledge source configured")

    try:
        if src.source_type == "obsidian":
            count = await _pull_obsidian(user_id, src.config or {})
        elif src.source_type == "notion":
            from app.services.integrations.notion import sync_pages
            count = await sync_pages(user_id)
        else:
            raise ValueError(f"Unknown source type: {src.source_type}")
        await _record_result(user_id, "ok", None)
        return count
    except Exception as e:
        await _record_result(user_id, "error", str(e)[:500])
        raise


async def _pull_obsidian(user_id: uuid.UUID, config: dict) -> int:
    settings = get_settings()
    # Server-side folder reads are only safe when this deployment is the user's own
    # machine (self-host). On hosted SaaS an arbitrary path would read server files.
    if not settings.vault_sync_enabled:
        raise ValueError("Folder sync is only available on self-hosted deployments — use Notion instead")

    raw_path = (config or {}).get("path", "")
    if not raw_path:
        raise ValueError("Vault path is not set")
    root = Path(raw_path).expanduser()
    if not root.is_dir():
        raise ValueError(f"Vault path does not exist or is not a folder: {root}")

    from app.services.vault_sync.sync_engine import handle_file_change

    count = 0
    for md_file in root.rglob("*.md"):
        if any(part in SKIP_DIRS for part in md_file.parts):
            continue
        rel = str(md_file.relative_to(root))
        await handle_file_change(user_id, rel, "modified", root=root)
        count += 1
        if count >= MAX_FILES_PER_PULL:
            logger.warning("Knowledge pull for %s hit %d-file cap", user_id, MAX_FILES_PER_PULL)
            break
    return count


async def _record_result(user_id: uuid.UUID, status: str, error: str | None) -> None:
    async with AsyncSessionLocal() as session:
        src = (await session.execute(
            select(KnowledgeSource).where(KnowledgeSource.user_id == user_id)
        )).scalar_one_or_none()
        if not src:
            return
        src.last_synced_at = datetime.utcnow()
        src.last_status = status
        src.last_error = error
        src.updated_at = datetime.utcnow()
        session.add(src)
        await session.commit()


async def run_knowledge_pull() -> None:
    """Scheduler entry — pull every enabled source whose interval has elapsed."""
    now = datetime.utcnow()
    async with AsyncSessionLocal() as session:
        sources = (await session.execute(
            select(KnowledgeSource).where(KnowledgeSource.enabled == True)  # noqa: E712
        )).scalars().all()

    for src in sources:
        due = (
            src.last_synced_at is None
            or src.last_synced_at + timedelta(minutes=src.sync_interval_minutes) <= now
        )
        if not due:
            continue
        try:
            count = await pull_source(src.user_id)
            logger.info("Knowledge pull for %s: %d items", src.user_id, count)
        except Exception as e:
            logger.warning("Knowledge pull for %s failed: %s", src.user_id, e)
