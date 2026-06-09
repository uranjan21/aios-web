from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.business import BusinessEvent

router = APIRouter(prefix="/api/areas/business", tags=["business"])


@router.get("/events")
async def list_events(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(BusinessEvent).order_by(desc(BusinessEvent.occurred_at)).limit(100))
    return result.scalars().all()


class BusinessEventCreate(BaseModel):
    event_type: str
    title: str
    description: Optional[str] = None
    mrr: Optional[float] = None
    product: str = "ledgr"
    occurred_at: Optional[datetime] = None


@router.post("/events")
async def create_event(body: BusinessEventCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    event = BusinessEvent(
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
async def get_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(BusinessEvent)
        .where(BusinessEvent.product == "ledgr")
        .where(BusinessEvent.event_type == "feature_shipped")
        .order_by(desc(BusinessEvent.occurred_at))
        .limit(1)
    )
    last_feature = result.scalar_one_or_none()

    mrr_result = await db.execute(
        select(BusinessEvent)
        .where(BusinessEvent.mrr.is_not(None))
        .order_by(desc(BusinessEvent.occurred_at))
        .limit(1)
    )
    mrr_event = mrr_result.scalar_one_or_none()

    return {
        "product": "ledgr",
        "last_feature": last_feature.title if last_feature else None,
        "last_feature_at": last_feature.occurred_at.isoformat() if last_feature else None,
        "mrr": float(mrr_event.mrr) if mrr_event and mrr_event.mrr else 0,
    }
