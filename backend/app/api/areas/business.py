from datetime import datetime, timezone
import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.business import Business, BusinessEvent

router = APIRouter(prefix="/api/areas/business", tags=["business"])

VALID_BUSINESS_STATUS = {"active", "paused", "archived"}


class BusinessCreate(BaseModel):
    name: str
    business_type: str
    description: Optional[str] = None
    color: Optional[str] = "var(--primary)"

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    business_type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None

@router.get("/")
async def list_businesses(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Business).where(Business.user_id == current_user.id).order_by(desc(Business.created_at)))
    return result.scalars().all()

@router.post("/")
async def create_business(body: BusinessCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    business = Business(
        user_id=current_user.id,
        name=body.name,
        business_type=body.business_type,
        description=body.description,
        color=body.color or "var(--primary)",
    )
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business

@router.patch("/{business_id}")
async def update_business(business_id: uuid.UUID, body: BusinessUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.user_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    if body.status is not None and body.status not in VALID_BUSINESS_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_BUSINESS_STATUS))}")

    update_data = body.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(business, key, value)
        
    db.add(business)
    await db.commit()
    await db.refresh(business)
    return business

@router.delete("/{business_id}")
async def delete_business(business_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Business).where(Business.id == business_id, Business.user_id == current_user.id))
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    events_result = await db.execute(
        select(BusinessEvent).where(BusinessEvent.business_id == business_id, BusinessEvent.user_id == current_user.id)
    )
    for event in events_result.scalars().all():
        await db.delete(event)

    await db.delete(business)
    await db.commit()
    return {"ok": True}


@router.get("/events")
async def list_events(business_id: Optional[uuid.UUID] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    query = select(BusinessEvent).where(BusinessEvent.user_id == current_user.id)
    if business_id:
        query = query.where(BusinessEvent.business_id == business_id)
    query = query.order_by(desc(BusinessEvent.occurred_at)).limit(100)
    result = await db.execute(query)
    return result.scalars().all()


class BusinessEventCreate(BaseModel):
    event_type: str
    title: str
    description: Optional[str] = None
    mrr: Optional[float] = None
    product: str = "ledgr"
    business_id: Optional[uuid.UUID] = None
    occurred_at: Optional[datetime] = None


@router.post("/events")
async def create_event(body: BusinessEventCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.business_id is not None:
        owned = await db.execute(
            select(Business.id).where(Business.id == body.business_id, Business.user_id == current_user.id)
        )
        if owned.scalar_one_or_none() is None:
            raise HTTPException(status_code=404, detail="Business not found")

    event = BusinessEvent(
        user_id=current_user.id,
        business_id=body.business_id,
        occurred_at=body.occurred_at or datetime.utcnow(),
        product=body.product,
        event_type=body.event_type,
        title=body.title,
        description=body.description,
        mrr=body.mrr,
        source="manual",
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/summary")
async def get_summary(business_id: Optional[uuid.UUID] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    q_feature = select(BusinessEvent).where(BusinessEvent.user_id == current_user.id).where(BusinessEvent.event_type == "feature_shipped")
    if business_id:
        q_feature = q_feature.where(BusinessEvent.business_id == business_id)
    else:
        q_feature = q_feature.where(BusinessEvent.product == "ledgr")
        
    result = await db.execute(q_feature.order_by(desc(BusinessEvent.occurred_at)).limit(1))
    last_feature = result.scalar_one_or_none()

    q_mrr = select(BusinessEvent).where(BusinessEvent.user_id == current_user.id).where(BusinessEvent.event_type == "mrr_update").where(BusinessEvent.mrr.is_not(None))
    if business_id:
        q_mrr = q_mrr.where(BusinessEvent.business_id == business_id)
        
    mrr_result = await db.execute(q_mrr.order_by(desc(BusinessEvent.occurred_at)).limit(1))
    mrr_event = mrr_result.scalar_one_or_none()

    return {
        "product": "ledgr",
        "last_feature": last_feature.title if last_feature else None,
        "last_feature_at": last_feature.occurred_at.isoformat() if last_feature else None,
        "mrr": float(mrr_event.mrr) if mrr_event and mrr_event.mrr else 0,
    }


@router.get("/mrr-history")
async def mrr_history(business_id: Optional[uuid.UUID] = None, current_user=Depends(get_current_user), db=Depends(get_db)):
    """MRR time series from events that recorded an MRR value."""
    query = select(BusinessEvent).where(BusinessEvent.user_id == current_user.id).where(BusinessEvent.mrr.is_not(None))
    if business_id:
        query = query.where(BusinessEvent.business_id == business_id)
        
    query = query.order_by(BusinessEvent.occurred_at)
    result = await db.execute(query)
    events = result.scalars().all()
    return [
        {"date": e.occurred_at.date().isoformat(), "mrr": float(e.mrr), "title": e.title}
        for e in events
    ]
