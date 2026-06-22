import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_current_user, get_db
from app.core.entitlements import require_plan
from app.models.integration import IntegrationCredential
from app.services.integrations.google_oauth import (
    build_auth_url,
    validate_state,
    exchange_code,
    save_tokens,
)
from app.services.integrations.google_calendar import (
    sync_events as sync_calendar_events,
    get_stored_events,
)
from app.services.integrations.google_fit import (
    sync_fitness,
    get_stored_metrics,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

PROVIDERS = ["notion", "gcal", "gfit", "github"]
GOOGLE_PROVIDERS = {"gcal", "gfit"}


@router.get("")
async def list_integrations(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(IntegrationCredential).where(IntegrationCredential.user_id == current_user.id)
    )
    existing = {r.provider: r for r in result.scalars().all()}

    out = []
    for provider in PROVIDERS:
        cred = existing.get(provider)
        out.append({
            "provider": provider,
            "status": cred.status if cred else "disconnected",
            "metadata": cred.metadata_ if cred else None,
            "token_expires_at": cred.token_expires_at.isoformat() if cred and cred.token_expires_at else None,
        })
    return out


@router.get("/{provider}/auth-url", dependencies=[Depends(require_plan("pro"))])
async def get_auth_url(provider: str, current_user=Depends(get_current_user)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    if provider in GOOGLE_PROVIDERS:
        try:
            url = build_auth_url(provider)
            return {"url": url}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    from app.core.config import get_settings
    settings = get_settings()
    base_urls = {
        "notion": "https://api.notion.com/v1/oauth/authorize",
        "github": "https://github.com/login/oauth/authorize",
    }
    client_ids = {
        "notion": settings.notion_client_id,
        "github": settings.github_client_id,
    }
    redirect_uri = f"{settings.allowed_origin}/integrations/{provider}/callback"
    url = f"{base_urls[provider]}?client_id={client_ids[provider]}&redirect_uri={redirect_uri}&response_type=code"
    return {"url": url}


class OAuthCallbackBody(BaseModel):
    code: str
    state: str


@router.post("/{provider}/callback")
async def oauth_callback(
    provider: str,
    body: OAuthCallbackBody,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if provider not in GOOGLE_PROVIDERS:
        raise HTTPException(status_code=400, detail="Callback not supported for this provider")

    validated_provider = validate_state(body.state)
    if not validated_provider or validated_provider != provider:
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    try:
        token_data = await exchange_code(provider, body.code)
    except Exception as e:
        logger.exception("OAuth token exchange failed for %s", provider)
        raise HTTPException(status_code=400, detail=f"Token exchange failed: {e}")

    cred = await save_tokens(current_user.id, db, provider, token_data)

    return {
        "status": "connected",
        "email": token_data.get("email", ""),
        "provider": provider,
    }


@router.get("/{provider}/status")
async def get_status(
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.user_id == current_user.id,
            IntegrationCredential.provider == provider,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred:
        return {"provider": provider, "status": "disconnected", "metadata": None}

    return {
        "provider": provider,
        "status": cred.status,
        "metadata": cred.metadata_,
        "token_expires_at": cred.token_expires_at.isoformat() if cred.token_expires_at else None,
        "updated_at": cred.updated_at.isoformat() if cred.updated_at else None,
    }


@router.delete("/{provider}")
async def disconnect(provider: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.user_id == current_user.id,
            IntegrationCredential.provider == provider,
        )
    )
    cred = result.scalar_one_or_none()
    if cred:
        cred.status = "disconnected"
        cred.access_token_encrypted = None
        cred.refresh_token_encrypted = None
        cred.updated_at = datetime.now(timezone.utc)
        db.add(cred)
        await db.commit()
    return {"status": "disconnected"}


@router.post("/{provider}/sync")
async def sync_provider(
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if provider not in GOOGLE_PROVIDERS:
        raise HTTPException(status_code=400, detail="Sync not supported for this provider")

    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.user_id == current_user.id,
            IntegrationCredential.provider == provider,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred or cred.status != "connected":
        raise HTTPException(status_code=400, detail=f"{provider} is not connected")

    try:
        if provider == "gcal":
            count = await sync_calendar_events(current_user.id, db)
        else:
            count = await sync_fitness(current_user.id, db)
    except Exception as e:
        logger.exception("Sync failed for %s", provider)
        raise HTTPException(status_code=500, detail=f"Sync failed: {e}")

    cred.updated_at = datetime.now(timezone.utc)
    db.add(cred)
    await db.commit()

    return {"synced": count, "provider": provider}


@router.get("/{provider}/test")
async def test_connection(provider: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.user_id == current_user.id,
            IntegrationCredential.provider == provider,
        )
    )
    cred = result.scalar_one_or_none()
    if not cred or cred.status != "connected":
        return {"ok": False, "details": "Not connected"}
    return {"ok": True, "details": f"{provider} connection is active"}


@router.get("/google/calendar")
async def get_calendar_events(
    date_from: str = Query(None),
    date_to: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    events = await get_stored_events(current_user.id, db, date_from=date_from, date_to=date_to)
    return {"events": events, "count": len(events)}


@router.get("/google/fitness")
async def get_fitness_metrics(
    date_from: str = Query(None),
    date_to: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    metrics = await get_stored_metrics(current_user.id, db, date_from=date_from, date_to=date_to)
    return {"metrics": metrics, "count": len(metrics)}
