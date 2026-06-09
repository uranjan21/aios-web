from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_current_user, get_db
from app.core.config import get_settings
from app.models.integration import IntegrationCredential

router = APIRouter(prefix="/api/integrations", tags=["integrations"])

PROVIDERS = ["notion", "gcal", "github"]


@router.get("")
async def list_integrations(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(IntegrationCredential))
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


@router.get("/{provider}/auth-url")
async def get_auth_url(provider: str, current_user=Depends(get_current_user)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    settings = get_settings()
    base_urls = {
        "notion": "https://api.notion.com/v1/oauth/authorize",
        "gcal": "https://accounts.google.com/o/oauth2/v2/auth",
        "github": "https://github.com/login/oauth/authorize",
    }
    client_ids = {
        "notion": settings.notion_client_id,
        "gcal": settings.gcal_client_id,
        "github": settings.github_client_id,
    }
    redirect_uri = f"{settings.allowed_origin}/integrations/{provider}/callback"
    url = f"{base_urls[provider]}?client_id={client_ids[provider]}&redirect_uri={redirect_uri}&response_type=code"
    return {"url": url}


@router.delete("/{provider}")
async def disconnect(provider: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unknown provider")

    result = await db.execute(select(IntegrationCredential).where(IntegrationCredential.provider == provider))
    cred = result.scalar_one_or_none()
    if cred:
        cred.status = "disconnected"
        cred.access_token_encrypted = None
        cred.refresh_token_encrypted = None
        cred.updated_at = datetime.utcnow()
        db.add(cred)
        await db.commit()
    return {"status": "disconnected"}


@router.get("/{provider}/test")
async def test_connection(provider: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(IntegrationCredential).where(IntegrationCredential.provider == provider))
    cred = result.scalar_one_or_none()
    if not cred or cred.status != "connected":
        return {"ok": False, "details": "Not connected"}
    return {"ok": True, "details": f"{provider} connection is active"}
