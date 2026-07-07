from collections import defaultdict
from datetime import datetime, timezone, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc, or_, func

from app.core.deps import get_current_user, get_db
from app.models.content import ContentItem, ContentCampaign

router = APIRouter(prefix="/api/areas/content", tags=["content"])

VALID_STATUS = {"idea", "in_progress", "scheduled", "published", "archived"}


# ── Items ────────────────────────────────────────────────────────────────────

@router.get("/items")
async def list_items(
    status: Optional[str] = None,
    platform: Optional[str] = None,
    content_type: Optional[str] = None,
    campaign_id: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    query = select(ContentItem).where(ContentItem.user_id == current_user.id)
    if status:
        query = query.where(ContentItem.status == status)
    if platform:
        query = query.where(ContentItem.platform == platform)
    if content_type:
        query = query.where(ContentItem.content_type == content_type)
    if campaign_id:
        import uuid
        try:
            campaign_uuid = uuid.UUID(campaign_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid campaign UUID")
        query = query.where(ContentItem.campaign_id == campaign_uuid)
    if tag:
        query = query.where(ContentItem.tags.ilike(f"%{tag}%"))
    if q:
        term = f"%{q.lower()}%"
        query = query.where(or_(
            func.lower(ContentItem.title).like(term),
            func.lower(ContentItem.body).like(term),
            func.lower(ContentItem.notes).like(term),
        ))
    query = query.order_by(ContentItem.position, desc(ContentItem.updated_at)).limit(500)
    result = await db.execute(query)
    return result.scalars().all()


class ContentItemCreate(BaseModel):
    title: str
    platform: str
    content_type: Optional[str] = None
    priority: Optional[str] = None
    body: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    pillar: Optional[str] = None
    campaign_id: Optional[str] = None
    idea_date: Optional[date] = None
    publish_date: Optional[date] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


async def _check_campaign_ownership(db, campaign_id: Optional[str], user_id) -> None:
    if campaign_id is None:
        return
    import uuid
    try:
        campaign_uuid = uuid.UUID(str(campaign_id))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign UUID")
    owned = await db.execute(
        select(ContentCampaign.id).where(ContentCampaign.id == campaign_uuid, ContentCampaign.user_id == user_id)
    )
    if owned.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Campaign not found")


@router.post("/items")
async def create_item(body: ContentItemCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.status is not None and body.status not in VALID_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUS))}")
    status = body.status or "idea"
    await _check_campaign_ownership(db, body.campaign_id, current_user.id)
    campaign_uuid = None
    if body.campaign_id:
        import uuid
        try:
            campaign_uuid = uuid.UUID(body.campaign_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid campaign UUID")
    item = ContentItem(
        user_id=current_user.id,
        title=body.title,
        platform=body.platform,
        content_type=body.content_type,
        priority=body.priority or "medium",
        body=body.body,
        notes=body.notes,
        tags=body.tags,
        pillar=body.pillar,
        campaign_id=campaign_uuid,
        idea_date=body.idea_date or date.today(),
        publish_date=body.publish_date,
        scheduled_at=body.scheduled_at,
        status=status,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


class ContentItemPatch(BaseModel):
    title: Optional[str] = None
    platform: Optional[str] = None
    content_type: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    body: Optional[str] = None
    notes: Optional[str] = None
    tags: Optional[str] = None
    pillar: Optional[str] = None
    campaign_id: Optional[str] = None
    position: Optional[int] = None
    publish_date: Optional[date] = None
    scheduled_at: Optional[datetime] = None
    url: Optional[str] = None
    views: Optional[int] = None
    likes: Optional[int] = None
    comments: Optional[int] = None
    shares: Optional[int] = None


@router.patch("/items/{item_id}")
async def patch_item(item_id: str, body: ContentItemPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    import uuid
    try:
        item_uuid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item UUID")
    result = await db.execute(
        select(ContentItem).where(ContentItem.user_id == current_user.id).where(ContentItem.id == item_uuid)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    data = body.model_dump(exclude_unset=True)

    if "status" in data and data["status"] not in VALID_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUS))}")

    if "campaign_id" in data:
        await _check_campaign_ownership(db, data["campaign_id"], current_user.id)

    # Transitioning into "published" stamps published_at + publish_date once.
    if data.get("status") == "published" and item.status != "published":
        now = datetime.utcnow()
        item.published_at = now
        if not item.publish_date and "publish_date" not in data:
            item.publish_date = now.date()

    for field, value in data.items():
        if field == "campaign_id" and value is not None:
            import uuid
            try:
                value = uuid.UUID(value)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid campaign UUID")
        setattr(item, field, value)

    item.updated_at = datetime.utcnow()
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}")
async def delete_item(item_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    import uuid
    try:
        item_uuid = uuid.UUID(item_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid item UUID")
    result = await db.execute(
        select(ContentItem).where(ContentItem.user_id == current_user.id).where(ContentItem.id == item_uuid)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    await db.delete(item)
    await db.commit()
    return {"status": "deleted"}


# ── Campaigns ────────────────────────────────────────────────────────────────

@router.get("/campaigns")
async def list_campaigns(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(ContentCampaign)
        .where(ContentCampaign.user_id == current_user.id)
        .order_by(desc(ContentCampaign.created_at))
    )
    campaigns = result.scalars().all()

    # Attach item counts per campaign in one grouped query.
    counts_result = await db.execute(
        select(ContentItem.campaign_id, func.count())
        .where(ContentItem.user_id == current_user.id)
        .where(ContentItem.campaign_id.is_not(None))
        .group_by(ContentItem.campaign_id)
    )
    counts = {row[0]: row[1] for row in counts_result.all()}
    return [{**c.model_dump(), "item_count": counts.get(c.id, 0)} for c in campaigns]


class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    goal: Optional[str] = None
    color: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


@router.post("/campaigns")
async def create_campaign(body: CampaignCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = await db.execute(
        select(ContentCampaign)
        .where(ContentCampaign.user_id == current_user.id)
        .where(ContentCampaign.name == body.name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A campaign with this name already exists")
    campaign = ContentCampaign(
        user_id=current_user.id,
        name=body.name,
        description=body.description,
        goal=body.goal,
        color=body.color or "#CA8A04",
        start_date=body.start_date,
        end_date=body.end_date,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return {**campaign.model_dump(), "item_count": 0}


class CampaignPatch(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goal: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None


@router.patch("/campaigns/{campaign_id}")
async def patch_campaign(campaign_id: str, body: CampaignPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    import uuid
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign UUID")
    result = await db.execute(
        select(ContentCampaign).where(ContentCampaign.user_id == current_user.id).where(ContentCampaign.id == campaign_uuid)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)
    campaign.updated_at = datetime.utcnow()
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return campaign


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    import uuid
    try:
        campaign_uuid = uuid.UUID(campaign_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid campaign UUID")
    result = await db.execute(
        select(ContentCampaign).where(ContentCampaign.user_id == current_user.id).where(ContentCampaign.id == campaign_uuid)
    )
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    # Detach items (FK is ON DELETE SET NULL but be explicit for in-session rows).
    items_result = await db.execute(
        select(ContentItem).where(ContentItem.user_id == current_user.id).where(ContentItem.campaign_id == campaign_uuid)
    )
    for item in items_result.scalars().all():
        item.campaign_id = None
        db.add(item)
    await db.delete(campaign)
    await db.commit()
    return {"status": "deleted"}


# ── Stats / analytics ────────────────────────────────────────────────────────

@router.get("/stats")
async def content_stats(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(ContentItem).where(ContentItem.user_id == current_user.id))
    items = result.scalars().all()

    by_status: dict[str, int] = defaultdict(int)
    by_platform: dict[str, int] = defaultdict(int)
    by_type: dict[str, int] = defaultdict(int)
    by_month: dict[str, int] = defaultdict(int)
    totals = {"views": 0, "likes": 0, "comments": 0, "shares": 0}

    for it in items:
        by_status[it.status] += 1
        by_platform[it.platform] += 1
        if it.content_type:
            by_type[it.content_type] += 1
        if it.status == "published":
            ref = it.published_at or (datetime.combine(it.publish_date, datetime.min.time()) if it.publish_date else None)
            if ref:
                by_month[ref.strftime("%Y-%m")] += 1
            totals["views"] += it.views or 0
            totals["likes"] += it.likes or 0
            totals["comments"] += it.comments or 0
            totals["shares"] += it.shares or 0

    published = [i for i in items if i.status == "published"]
    top_performers = sorted(
        published,
        key=lambda i: (i.views or 0) + (i.likes or 0) * 3 + (i.comments or 0) * 5 + (i.shares or 0) * 7,
        reverse=True,
    )[:5]

    return {
        "total": len(items),
        "by_status": dict(by_status),
        "by_platform": dict(by_platform),
        "by_type": dict(by_type),
        "by_month": dict(sorted(by_month.items())),
        "totals": totals,
        "published_count": len(published),
        "top_performers": [
            {
                "id": str(i.id), "title": i.title, "platform": i.platform,
                "views": i.views, "likes": i.likes, "comments": i.comments, "shares": i.shares,
            }
            for i in top_performers
        ],
    }


# ── Vault twitter queue (single-tenant self-host feature) ────────────────────

@router.get("/twitter-queue")
async def twitter_queue(current_user=Depends(get_current_user)):
    from app.core.config import get_settings
    from app.services.vault_sync.writer import VaultWriteGuard
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    content = guard.read_file("05-content/pipeline/twitter-queue.md")
    return {"raw_content": content or ""}
