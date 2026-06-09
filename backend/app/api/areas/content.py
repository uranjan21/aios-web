from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.content import ContentItem

router = APIRouter(prefix="/api/areas/content", tags=["content"])


@router.get("/items")
async def list_items(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = select(ContentItem).order_by(desc(ContentItem.updated_at))
    if status:
        query = query.where(ContentItem.status == status)
    if platform:
        query = query.where(ContentItem.platform == platform)
    query = query.limit(200)
    result = await db.execute(query)
    return result.scalars().all()


class ContentItemCreate(BaseModel):
    title: str
    platform: str
    content_type: Optional[str] = None
    notes: Optional[str] = None
    idea_date: Optional[date] = None


@router.post("/items")
async def create_item(body: ContentItemCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    item = ContentItem(
        title=body.title,
        platform=body.platform,
        content_type=body.content_type,
        notes=body.notes,
        idea_date=body.idea_date or date.today(),
        status="idea",
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


class ContentItemPatch(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    content_type: Optional[str] = None
    status: Optional[str] = None
    publish_date: Optional[date] = None
    notes: Optional[str] = None


@router.patch("/items/{item_id}")
async def patch_item(item_id: str, body: ContentItemPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(ContentItem).where(ContentItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    if body.title is not None:
        item.title = body.title
    if body.platform is not None:
        item.platform = body.platform
    if body.content_type is not None:
        item.content_type = body.content_type
    if body.status is not None:
        item.status = body.status
    if body.publish_date is not None:
        item.publish_date = body.publish_date
    if body.notes is not None:
        item.notes = body.notes
    item.updated_at = datetime.utcnow()
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item

@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(ContentItem).where(ContentItem.id == item_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return {"status": "deleted"}


@router.get("/twitter-queue")
async def twitter_queue(current_user=Depends(get_current_user)):
    from app.core.config import get_settings
    from app.services.vault_sync.writer import VaultWriteGuard
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    content = guard.read_file("05-content/pipeline/twitter-queue.md")
    return {"raw_content": content or ""}
