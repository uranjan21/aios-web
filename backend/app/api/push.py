"""Web-push subscription endpoints."""
import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.models.push import PushSubscription

router = APIRouter(prefix="/api/push", tags=["push"])
logger = logging.getLogger(__name__)


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionBody(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


@router.get("/public-key")
async def public_key(current_user=Depends(get_current_user)):
    return {"public_key": get_settings().vapid_public_key}


@router.post("/subscribe")
async def subscribe(body: SubscriptionBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )).scalar_one_or_none()
    if existing:
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
        db.add(existing)
    else:
        db.add(PushSubscription(endpoint=body.endpoint, p256dh=body.keys.p256dh, auth=body.keys.auth))
    await db.commit()
    return {"status": "subscribed"}


class UnsubscribeBody(BaseModel):
    endpoint: str


@router.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = (await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == body.endpoint)
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"status": "unsubscribed"}
