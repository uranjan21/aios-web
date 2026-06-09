import asyncio
import json
import logging
from typing import Set

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.core.deps import get_current_user
from app.core.rate_limit import limiter
from app.services.vault_sync import sync_engine

router = APIRouter(prefix="/api/sync", tags=["sync"])
logger = logging.getLogger(__name__)


@router.get("/status")
async def sync_status(current_user=Depends(get_current_user)):
    return await sync_engine.get_sync_status()


@router.post("/force")
@limiter.limit("1/minute")
async def force_sync(request: Request, current_user=Depends(get_current_user)):
    from app.core.config import get_settings
    from pathlib import Path
    settings = get_settings()
    vault = Path(settings.vault_path)

    async def _resync():
        for md_file in vault.rglob("*.md"):
            rel = str(md_file.relative_to(vault))
            await sync_engine.handle_file_change(rel, "modified")

    task = asyncio.create_task(_resync())
    task.add_done_callback(_resync_done)
    return {"status": "resync_started"}


def _resync_done(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception():
        logger.error("Vault resync task failed: %s", task.exception())


@router.get("/conflicts")
async def list_conflicts(current_user=Depends(get_current_user)):
    from sqlmodel import select
    from app.models.vault import VaultConflict, VaultFile
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VaultConflict, VaultFile)
            .join(VaultFile, VaultFile.id == VaultConflict.file_id)
            .where(VaultConflict.resolved_at.is_(None))
        )
        rows = result.all()

    return [
        {
            "id": str(conflict.id),
            "path": vf.path,
            "detected_at": conflict.detected_at.isoformat(),
        }
        for conflict, vf in rows
    ]


class ResolveRequest(BaseModel):
    resolution: str  # "kept_app" | "kept_vault"


@router.post("/conflicts/{conflict_id}/resolve")
async def resolve_conflict(
    conflict_id: str,
    body: ResolveRequest,
    current_user=Depends(get_current_user),
):
    from datetime import datetime
    from sqlmodel import select
    from app.models.vault import VaultConflict, VaultFile
    from app.db.session import AsyncSessionLocal

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(VaultConflict).where(VaultConflict.id == conflict_id)
        )
        conflict = result.scalar_one_or_none()
        if not conflict:
            raise HTTPException(status_code=404, detail="Conflict not found")

        conflict.resolved_at = datetime.utcnow()
        conflict.resolution = body.resolution
        session.add(conflict)

        file_result = await session.execute(
            select(VaultFile).where(VaultFile.id == conflict.file_id)
        )
        vf = file_result.scalar_one_or_none()
        if vf:
            vf.sync_status = "ok"
            if body.resolution == "kept_vault":
                from app.core.config import get_settings
                settings = get_settings()
                from app.services.vault_sync.writer import VaultWriteGuard
                guard = VaultWriteGuard(settings.vault_path)
                vf.content = conflict.vault_content
            session.add(vf)

        await session.commit()

    return {"status": "resolved"}


async def sync_ws_handler(websocket: WebSocket) -> None:
    await websocket.accept()

    async def send_event(event: dict) -> None:
        await websocket.send_text(json.dumps(event))

    sync_engine.register_sync_subscriber(send_event)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    finally:
        sync_engine.unregister_sync_subscriber(send_event)
