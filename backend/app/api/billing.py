"""Billing endpoints (Stripe). Inert until STRIPE_SECRET_KEY + price ids are set."""
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.entitlements import PLAN_FEATURES
from app.models.user import User
from app.services.billing import service as billing

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])


def _require_billing():
    if not get_settings().billing_enabled:
        raise HTTPException(status_code=404, detail="Billing is not enabled")


async def _load_user(db, user_id) -> User:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.get("/subscription")
async def get_my_subscription(current_user=Depends(get_current_user), db=Depends(get_db)):
    settings = get_settings()
    sub = await billing.get_subscription(db, current_user.id)
    plan = sub.plan if sub else "free"
    status_ = sub.status if sub else "active"
    addons = sub.addons if sub and sub.addons else []
    return {
        "plan": plan,
        "status": status_,
        "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
        "features": PLAN_FEATURES.get(plan, PLAN_FEATURES["free"]),
        "addons": addons,
        "billing_enabled": settings.billing_enabled,
    }


class CheckoutBody(BaseModel):
    plan: str  # "pro" | "household"


@router.post("/checkout")
async def create_checkout(body: CheckoutBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_billing()
    settings = get_settings()
    user = await _load_user(db, current_user.id)
    success_url = f"{settings.allowed_origin}/app/settings?billing=success"
    cancel_url = f"{settings.allowed_origin}/pricing"
    try:
        url = await billing.create_checkout_session(db, user, body.plan, success_url, cancel_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Checkout session creation failed")
        raise HTTPException(status_code=502, detail="Could not start checkout — please try again")
    return {"url": url}


@router.post("/portal")
async def create_portal(current_user=Depends(get_current_user), db=Depends(get_db)):
    _require_billing()
    settings = get_settings()
    user = await _load_user(db, current_user.id)
    try:
        url = await billing.create_portal_session(db, user, return_url=f"{settings.allowed_origin}/app/settings")
    except Exception:
        logger.exception("Portal session creation failed")
        raise HTTPException(status_code=502, detail="Could not open billing portal — please try again")
    return {"url": url}


@router.post("/webhook")
async def stripe_webhook(request: Request, db=Depends(get_db)):
    settings = get_settings()
    if not settings.billing_enabled or not settings.stripe_webhook_secret:
        raise HTTPException(status_code=404, detail="Billing is not enabled")

    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    try:
        import stripe
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as e:
        logger.warning("Invalid Stripe webhook signature: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        await billing.handle_webhook_event(db, event)
    except Exception:
        logger.exception("Failed to process Stripe webhook %s", event.get("type"))
        # 200 anyway so Stripe doesn't infinitely retry a poisoned event; we've logged it.
    return Response(status_code=200)
