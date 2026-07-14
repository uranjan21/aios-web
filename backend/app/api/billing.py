"""Billing endpoints (Stripe). Inert until STRIPE_SECRET_KEY + price ids are set."""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.entitlements import (
    PLAN_FEATURES, AREA_MODULES, SERVICE_MODULES, BUNDLE_KEY, get_entitled_modules,
)
from app.models.user import User
from app.services.billing import service as billing

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])

# Modules that bill metered AI usage on top of their flat price.
_METERED = {"chat", "agents"}


@router.get("/catalog")
async def get_catalog():
    """Structural catalog of purchasable modules (drives the manage-modules UI).
    Display prices live in the frontend `lib/pricing.ts`; entitlement keys here."""
    def _mod(key: str, kind: str) -> dict:
        return {"key": key, "kind": kind, "metered": key in _METERED}
    return {
        "modules": [_mod(k, "area") for k in AREA_MODULES]
        + [_mod(k, "service") for k in SERVICE_MODULES],
        "bundle_key": BUNDLE_KEY,
    }


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
    entitled = sorted(await get_entitled_modules(db, current_user))
    return {
        "plan": plan,
        "status": status_,
        "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
        "features": PLAN_FEATURES.get(plan, PLAN_FEATURES["free"]),
        "addons": addons,
        # Modular fields (Phase 1) — `entitled` is the resolved access set.
        "modules": (sub.modules if sub and sub.modules else []),
        "bundle": bool(sub.bundle) if sub else False,
        "free_area": (sub.free_area if sub else None),
        "entitled": entitled,
        "billing_enabled": settings.billing_enabled,
    }


@router.get("/usage")
async def get_my_usage(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Metered AI usage this month: used / included / overage / billable."""
    from app.services.billing.usage import monthly_summary
    return await monthly_summary(db, current_user)


class ModulesBody(BaseModel):
    modules: list[str] = []
    bundle: bool = False


@router.post("/modules")
async def set_my_modules(body: ModulesBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Set the desired owned-module set. When billing is on and paid modules are
    selected, returns a Stripe `checkout_url`; otherwise applies immediately."""
    user = await _load_user(db, current_user.id)
    try:
        return await billing.set_modules(db, user, body.modules, body.bundle)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception:
        logger.exception("Updating modules failed")
        raise HTTPException(status_code=502, detail="Could not update modules — please try again")


class FreeAreaBody(BaseModel):
    area: str | None = None


@router.post("/free-area")
async def set_my_free_area(body: FreeAreaBody, current_user=Depends(get_current_user), db=Depends(get_db)):
    """Pick/change the single free area (entitlement-only, no billing event)."""
    if body.area is not None and body.area not in AREA_MODULES:
        raise HTTPException(status_code=400, detail="free_area must be one of the area modules")
    sub = await billing.set_free_area(db, current_user.id, body.area)
    return {"free_area": sub.free_area}


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
    except Exception as exc:
        logger.exception("Failed to process Stripe webhook %s", event.get("type"))
        # Persist to dead-letter queue for background retry; return 200 so Stripe
        # doesn't re-deliver — the scheduler will retry up to 3 times.
        from datetime import timedelta
        from app.models.billing import FailedWebhook
        import json as _json
        try:
            db.add(FailedWebhook(
                event_id=str(event.get("id", "")),
                event_type=str(event.get("type", "")),
                payload=_json.dumps(dict(event)),
                error=str(exc),
                next_retry_at=datetime.utcnow() + timedelta(minutes=5),
            ))
            await db.commit()
        except Exception:
            logger.exception("Could not persist failed webhook to dead-letter queue")
    return Response(status_code=200)
