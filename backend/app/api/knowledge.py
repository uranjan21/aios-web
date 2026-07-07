"""Knowledge base configuration — the user's external source of truth
(Obsidian vault folder on self-host, or Notion workspace) pulled periodically
into the RAG store."""
import asyncio
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.models.knowledge import KnowledgeSource

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])
logger = logging.getLogger(__name__)

VALID_TYPES = {"obsidian", "notion"}


def _serialize(src: Optional[KnowledgeSource]) -> dict:
    settings = get_settings()
    if not src:
        return {
            "configured": False,
            "folder_sync_available": settings.vault_sync_enabled,
        }
    return {
        "configured": True,
        "folder_sync_available": settings.vault_sync_enabled,
        "source_type": src.source_type,
        "config": src.config or {},
        "enabled": src.enabled,
        "sync_interval_minutes": src.sync_interval_minutes,
        "last_synced_at": src.last_synced_at.isoformat() if src.last_synced_at else None,
        "last_status": src.last_status,
        "last_error": src.last_error,
    }


async def _get_source(db, user_id) -> Optional[KnowledgeSource]:
    result = await db.execute(select(KnowledgeSource).where(KnowledgeSource.user_id == user_id))
    return result.scalar_one_or_none()


@router.get("/source")
async def get_source(current_user=Depends(get_current_user), db=Depends(get_db)):
    return _serialize(await _get_source(db, current_user.id))


class SourceBody(BaseModel):
    source_type: str
    config: Optional[dict] = None
    sync_interval_minutes: Optional[int] = None
    enabled: Optional[bool] = None


@router.put("/source")
async def put_source(body: SourceBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    settings = get_settings()
    if body.source_type not in VALID_TYPES:
        raise HTTPException(status_code=422, detail=f"source_type must be one of {sorted(VALID_TYPES)}")

    config = body.config or {}
    if body.source_type == "obsidian":
        if not settings.vault_sync_enabled:
            raise HTTPException(
                status_code=400,
                detail="Folder sync is only available on self-hosted deployments — connect Notion instead",
            )
        raw_path = (config.get("path") or "").strip()
        if not raw_path:
            raise HTTPException(status_code=422, detail="config.path is required for an Obsidian source")
        path = Path(raw_path).expanduser()
        if not path.is_dir():
            raise HTTPException(status_code=400, detail=f"Path does not exist or is not a folder: {path}")
        config = {"path": str(path)}
    else:
        config = {}

    interval = body.sync_interval_minutes if body.sync_interval_minutes is not None else 30
    interval = max(5, min(interval, 1440))

    src = await _get_source(db, current_user.id)
    now = datetime.utcnow()
    if src:
        changed = src.source_type != body.source_type or (src.config or {}) != config
        src.source_type = body.source_type
        src.config = config
        src.sync_interval_minutes = interval
        if body.enabled is not None:
            src.enabled = body.enabled
        if changed:
            src.last_synced_at = None
            src.last_status = None
            src.last_error = None
        src.updated_at = now
    else:
        src = KnowledgeSource(
            user_id=current_user.id,
            source_type=body.source_type,
            config=config,
            sync_interval_minutes=interval,
            enabled=body.enabled if body.enabled is not None else True,
        )
    db.add(src)
    await db.commit()
    await db.refresh(src)
    return _serialize(src)


@router.post("/source/sync")
@limiter.limit("2/minute")
async def sync_now(request: Request, current_user=Depends(get_current_user), db=Depends(get_db)):
    src = await _get_source(db, current_user.id)
    if not src:
        raise HTTPException(status_code=400, detail="No knowledge source configured")

    from app.services.knowledge.puller import pull_source

    async def _run():
        try:
            await pull_source(current_user.id)
        except Exception as e:
            logger.warning("Manual knowledge pull failed for %s: %s", current_user.id, e)

    task = asyncio.create_task(_run())
    task.add_done_callback(lambda t: t.cancelled() or (t.exception() and logger.error(
        "Knowledge pull task failed: %s", t.exception())))
    return {"status": "sync_started"}


@router.delete("/source")
async def delete_source(current_user=Depends(get_current_user), db=Depends(get_db)):
    src = await _get_source(db, current_user.id)
    if src:
        await db.delete(src)
        await db.commit()
    return {"status": "deleted"}
