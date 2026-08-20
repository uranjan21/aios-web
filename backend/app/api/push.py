"""Web-push subscription endpoints."""
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlmodel import func, select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.models.push import PushSubscription
from app.services.notifications.push import validate_push_endpoint

router = APIRouter(prefix="/api/push", tags=["push"])
logger = logging.getLogger(__name__)

# Nothing capped this before — one user could register unbounded rows, each of
# which the sender fans out to on every notification.
MAX_SUBSCRIPTIONS_PER_USER = 20


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class SubscriptionBody(BaseModel):
    endpoint: str
    keys: SubscriptionKeys

    @field_validator("endpoint")
    @classmethod
    def _check_endpoint(cls, v: str) -> str:
        return validate_push_endpoint(v)


@router.get("/public-key")
async def public_key(current_user=Depends(get_current_user)):
    return {"public_key": get_settings().vapid_public_key}


@router.post("/subscribe")
async def subscribe(body: SubscriptionBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    # Look up by (user_id, endpoint) so we never reassign another user's subscription.
    existing = (await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if existing:
        existing.p256dh = body.keys.p256dh
        existing.auth = body.keys.auth
        db.add(existing)
    else:
        count = (await db.execute(
            select(func.count()).select_from(PushSubscription)
            .where(PushSubscription.user_id == current_user.id)
        )).scalar_one()
        if count >= MAX_SUBSCRIPTIONS_PER_USER:
            raise HTTPException(
                status_code=409,
                detail=f"Too many push subscriptions (max {MAX_SUBSCRIPTIONS_PER_USER}). Remove one first.",
            )
        db.add(PushSubscription(
            user_id=current_user.id,
            endpoint=body.endpoint,
            p256dh=body.keys.p256dh,
            auth=body.keys.auth,
        ))
    await db.commit()
    return {"status": "subscribed"}


class UnsubscribeBody(BaseModel):
    endpoint: str


@router.post("/unsubscribe")
async def unsubscribe(body: UnsubscribeBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    existing = (await db.execute(
        select(PushSubscription).where(
            PushSubscription.endpoint == body.endpoint,
            PushSubscription.user_id == current_user.id,
        )
    )).scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()
    return {"status": "unsubscribed"}
