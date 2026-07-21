import asyncio
import logging
import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_current_user, get_db
from app.core.entitlements import require_plan
from app.models.integration import IntegrationCredential
from app.models.oauth_state import OAuthState
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

PROVIDERS = ["notion", "gcal", "gfit", "gmail", "github"]
GOOGLE_PROVIDERS = {"gcal", "gfit", "gmail"}
SYNCABLE_PROVIDERS = GOOGLE_PROVIDERS | {"notion"}


def _gmail_account_out(cred: IntegrationCredential) -> dict:
    return {
        "email": cred.account_email or (cred.metadata_ or {}).get("email", ""),
        "status": cred.status,
        "connected_at": cred.created_at.isoformat() if cred.created_at else None,
        "last_sync": cred.updated_at.isoformat() if cred.updated_at else None,
    }


def _gmail_summary(creds: list[IntegrationCredential]) -> dict:
    """Aggregate the N gmail credential rows into one provider entry + accounts list."""
    connected = [c for c in creds if c.status == "connected"]
    primary = connected[0] if connected else (creds[0] if creds else None)
    return {
        "provider": "gmail",
        "status": primary.status if primary else "disconnected",
        "metadata": primary.metadata_ if primary else None,
        "token_expires_at": primary.token_expires_at.isoformat() if primary and primary.token_expires_at else None,
        "accounts": [_gmail_account_out(c) for c in creds],
    }


@router.get("")
async def list_integrations(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(IntegrationCredential).where(IntegrationCredential.user_id == current_user.id)
    )
    rows = result.scalars().all()
    existing = {r.provider: r for r in rows if r.provider != "gmail"}
    gmail_creds = sorted((r for r in rows if r.provider == "gmail"), key=lambda c: c.created_at)

    out = []
    for provider in PROVIDERS:
        if provider == "gmail":
            out.append(_gmail_summary(gmail_creds))
            continue
        cred = existing.get(provider)
        out.append({
            "provider": provider,
            "status": cred.status if cred else "disconnected",
            "metadata": cred.metadata_ if cred else None,
            "token_expires_at": cred.token_expires_at.isoformat() if cred and cred.token_expires_at else None,
        })
    return out


@router.get("/{provider}/auth-url", dependencies=[Depends(require_plan("pro"))])
async def get_auth_url(provider: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    if provider in GOOGLE_PROVIDERS:
        try:
            url = await build_auth_url(provider, db, user_id=current_user.id)
            return {"url": url}
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

    from app.core.config import get_settings
    from urllib.parse import urlencode
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
    # Generate CSRF state token and persist in DB (H3).
    # Use naive UTC to match the oauth_states.created_at column (TIMESTAMP WITHOUT
    # TIME ZONE) and the auth.py login flow — avoids naive/aware mismatch.
    state = secrets.token_urlsafe(32)
    db.add(OAuthState(state=state, provider=provider, user_id=current_user.id, created_at=datetime.utcnow()))
    await db.commit()
    params = {
        "client_id": client_ids[provider],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": state,
    }
    if provider == "notion":
        params["owner"] = "user"
    url = f"{base_urls[provider]}?{urlencode(params)}"
    return {"url": url}


class OAuthCallbackBody(BaseModel):
    code: str
    state: str


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
    creds = result.scalars().all()
    if provider == "gmail":
        return _gmail_summary(sorted(creds, key=lambda c: c.created_at))
    cred = creds[0] if creds else None
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
async def disconnect(
    provider: str,
    account_email: str = Query(None),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    """Disconnect a provider. For gmail, pass ?account_email= to unlink one
    linked account; omit it to disconnect every linked gmail account."""
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    query = select(IntegrationCredential).where(
        IntegrationCredential.user_id == current_user.id,
        IntegrationCredential.provider == provider,
    )
    if provider == "gmail" and account_email is not None:
        query = query.where(IntegrationCredential.account_email == account_email)
    result = await db.execute(query)
    creds = result.scalars().all()
    if provider == "gmail" and account_email is not None and not creds:
        raise HTTPException(status_code=404, detail="Linked account not found")
    for cred in creds:
        cred.status = "disconnected"
        cred.access_token_encrypted = None
        cred.refresh_token_encrypted = None
        cred.updated_at = datetime.now(timezone.utc)
        db.add(cred)
    if creds:
        await db.commit()
    return {"status": "disconnected"}


@router.post("/{provider}/sync")
async def sync_provider(
    provider: str,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    if provider not in SYNCABLE_PROVIDERS:
        raise HTTPException(status_code=400, detail="Sync not supported for this provider")

    result = await db.execute(
        select(IntegrationCredential).where(
            IntegrationCredential.user_id == current_user.id,
            IntegrationCredential.provider == provider,
        )
    )
    connected = [c for c in result.scalars().all() if c.status == "connected"]
    cred = connected[0] if connected else None
    if not cred:
        raise HTTPException(status_code=400, detail=f"{provider} is not connected")

    try:
        if provider == "gcal":
            count = await sync_calendar_events(current_user.id, db)
        elif provider == "gfit":
            count = await sync_fitness(current_user.id, db)
        elif provider == "gmail":
            from app.services.integrations.gmail import sync_messages
            count = await sync_messages(current_user.id, db)
        else:
            from app.services.integrations.notion import sync_pages
            count = await sync_pages(current_user.id)
    except Exception:
        logger.exception("Sync failed for %s", provider)
        raise HTTPException(status_code=500, detail="Sync failed — check server logs")

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
    if not any(c.status == "connected" for c in result.scalars().all()):
        return {"ok": False, "details": "Not connected"}
    return {"ok": True, "details": f"{provider} connection is active"}


