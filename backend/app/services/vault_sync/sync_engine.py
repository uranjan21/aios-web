"""Orchestrates vault file changes → DB upserts + conflict detection + WebSocket broadcast."""
import asyncio
import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable, Awaitable, Set

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.vault import VaultFile, VaultConflict
from app.services.vault_sync.parser import detect_area, detect_file_type
from app.services.rag.embedder import embed_vault_file

logger = logging.getLogger(__name__)

# Broadcast callbacks registered by WebSocket handler
_sync_subscribers: Set[Callable[[dict], Awaitable[None]]] = set()


def register_sync_subscriber(cb: Callable[[dict], Awaitable[None]]) -> None:
    _sync_subscribers.add(cb)


def unregister_sync_subscriber(cb: Callable[[dict], Awaitable[None]]) -> None:
    _sync_subscribers.discard(cb)


async def _broadcast(event: dict) -> None:
    dead = set()
    for cb in list(_sync_subscribers):
        try:
            await cb(event)
        except Exception:
            dead.add(cb)
    _sync_subscribers.difference_update(dead)


def _checksum(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


async def _read_with_retry(abs_path: Path, retries: int = 3, delay: float = 1.0) -> str | None:
    for attempt in range(retries):
        try:
            return abs_path.read_text(encoding="utf-8")
        except (OSError, IOError):
            if attempt < retries - 1:
                await asyncio.sleep(delay)
    return None


async def handle_file_change(rel_path: str, change_type: str) -> None:
    settings = get_settings()
    vault_root = Path(settings.vault_path)
    abs_path = vault_root / rel_path

    if change_type == "deleted":
        await _mark_missing(rel_path)
        return

    content = await _read_with_retry(abs_path)
    if content is None:
        logger.warning("Could not read vault file after retries: %s", rel_path)
        return

    new_checksum = _checksum(content)
    area = detect_area(rel_path)
    file_type = detect_file_type(rel_path)

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultFile).where(VaultFile.path == rel_path))
        existing: VaultFile | None = result.scalar_one_or_none()

        if existing and existing.checksum == new_checksum:
            return  # No actual change

        if existing and existing.sync_status == "ok" and existing.content != content:
            # Conflict: app already has content, vault diverged
            await _create_conflict(session, existing, content)
            return

        now = datetime.utcnow()
        if existing:
            existing.content = content
            existing.checksum = new_checksum
            existing.area = area
            existing.file_type = file_type
            existing.sync_status = "ok"
            existing.last_synced_at = now
            existing.error_message = None
            existing.updated_at = now
            session.add(existing)
        else:
            vault_file = VaultFile(
                path=rel_path,
                area=area,
                file_type=file_type,
                content=content,
                checksum=new_checksum,
                sync_status="ok",
                last_synced_at=now,
            )
            session.add(vault_file)

        await session.commit()

    # Embed for RAG (non-blocking)
    asyncio.create_task(embed_vault_file(rel_path, content))

    await _broadcast({"type": "vault_updated", "path": rel_path, "area": area})
    logger.info("Synced vault file: %s (%s)", rel_path, change_type)


async def _mark_missing(rel_path: str) -> None:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultFile).where(VaultFile.path == rel_path))
        existing = result.scalar_one_or_none()
        if existing:
            existing.sync_status = "missing"
            existing.updated_at = datetime.utcnow()
            session.add(existing)
            await session.commit()
    await _broadcast({"type": "vault_missing", "path": rel_path})


async def _create_conflict(session: AsyncSession, existing: VaultFile, vault_content: str) -> None:
    existing.sync_status = "conflict"
    existing.updated_at = datetime.utcnow()
    session.add(existing)

    conflict = VaultConflict(
        file_id=existing.id,
        app_content=existing.content,
        vault_content=vault_content,
    )
    session.add(conflict)
    await session.commit()

    await _broadcast({
        "type": "conflict_detected",
        "path": existing.path,
        "conflict_id": str(conflict.id),
    })
    logger.warning("Conflict detected on vault file: %s", existing.path)


async def get_sync_status() -> dict:
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(VaultFile))
        files = result.scalars().all()

    total = len(files)
    conflicts = [f for f in files if f.sync_status == "conflict"]
    errors = [f for f in files if f.sync_status == "error"]
    last_synced = max((f.last_synced_at for f in files if f.last_synced_at), default=None)

    return {
        "file_count": total,
        "last_synced": last_synced.isoformat() if last_synced else None,
        "conflicts": [{"id": str(c.id), "path": c.path} for c in conflicts],
        "errors": [{"path": e.path, "error": e.error_message} for e in errors],
    }
