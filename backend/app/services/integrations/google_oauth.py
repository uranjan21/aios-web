import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from urllib.parse import urlencode

import httpx
from sqlmodel import select

from app.core.config import get_settings
from app.core.security import encrypt_token, decrypt_token
from app.models.integration import IntegrationCredential

logger = logging.getLogger(__name__)

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

SCOPES_BY_PROVIDER = {
    "gcal": [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly",
    ],
    "gfit": [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/fitness.activity.read",
        "https://www.googleapis.com/auth/fitness.body.read",
        "https://www.googleapis.com/auth/fitness.heart_rate.read",
    ],
    "gmail": [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/gmail.readonly",
    ],
}

def _client_creds(provider: str) -> tuple[str, str]:
    settings = get_settings()
    if provider == "gcal":
        return settings.gcal_client_id, settings.gcal_client_secret
    if provider == "gfit":
        return settings.gfit_client_id, settings.gfit_client_secret
    if provider == "gmail":
        # Same Google Cloud app as calendar unless dedicated creds are set.
        if settings.gmail_client_id:
            return settings.gmail_client_id, settings.gmail_client_secret
        return settings.gcal_client_id, settings.gcal_client_secret
    raise ValueError(f"Unknown Google provider: {provider}")


async def build_auth_url(provider: str, db, user_id: Optional[uuid.UUID] = None) -> str:
    """Build an OAuth authorization URL and persist the CSRF state token in the DB (H3)."""
    client_id, _ = _client_creds(provider)
    if not client_id:
        raise ValueError(f"{provider.upper()}_CLIENT_ID is not configured")

    settings = get_settings()
    state = secrets.token_urlsafe(32)
    redirect_uri = f"{settings.allowed_origin}/integrations/{provider}/callback"

    from app.models.oauth_state import OAuthState
    # Naive UTC to match the oauth_states.created_at column (TIMESTAMP WITHOUT TIME ZONE).
    db.add(OAuthState(state=state, provider=provider, user_id=user_id, created_at=datetime.utcnow()))
    await db.commit()

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES_BY_PROVIDER[provider]),
        "access_type": "offline",
        "prompt": "consent",
        "state": state,
    }
    return f"{GOOGLE_AUTH_URL}?{urlencode(params)}"


async def validate_state(state: str, db, user_id: Optional[uuid.UUID] = None) -> Optional[str]:
    """Consume and validate the CSRF state token from the DB (H3).

    When user_id is provided the state must also belong to that user, preventing
    cross-user state token injection for the integrations callback flow.
    """
    from app.models.oauth_state import OAuthState
    from sqlmodel import select
    query = select(OAuthState).where(OAuthState.state == state)
    if user_id is not None:
        query = query.where(OAuthState.user_id == user_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    if not entry:
        return None
    await db.delete(entry)
    await db.commit()
    # created_at is naive UTC; compare against naive UTC now.
    age = datetime.utcnow() - entry.created_at
    if age > timedelta(minutes=10):
        return None
    return entry.provider


async def exchange_code(provider: str, code: str) -> dict:
    client_id, client_secret = _client_creds(provider)
    settings = get_settings()
    redirect_uri = f"{settings.allowed_origin}/integrations/{provider}/callback"

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": client_id,
                "client_secret": client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

        userinfo = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        userinfo.raise_for_status()
        user = userinfo.json()

    return {
        "access_token": tokens["access_token"],
        "refresh_token": tokens.get("refresh_token"),
        "expires_in": tokens.get("expires_in", 3600),
        "email": user.get("email", ""),
        "name": user.get("name", ""),
        "picture": user.get("picture", ""),
    }


async def refresh_access_token(provider: str, refresh_token_encrypted: str) -> dict:
    client_id, client_secret = _client_creds(provider)
    refresh_token = decrypt_token(refresh_token_encrypted)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        resp.raise_for_status()
        tokens = resp.json()

    return {
        "access_token": tokens["access_token"],
        "expires_in": tokens.get("expires_in", 3600),
    }


async def save_tokens(user_id: uuid.UUID, db, provider: str, token_data: dict) -> IntegrationCredential:
    result = await db.execute(
        select(IntegrationCredential).where(IntegrationCredential.user_id == user_id).where(IntegrationCredential.provider == provider)
    )
    cred = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=token_data["expires_in"])

    if not cred:
        cred = IntegrationCredential(
            user_id=user_id,
            provider=provider,
            access_token_encrypted=encrypt_token(token_data["access_token"]),
            refresh_token_encrypted=(
                encrypt_token(token_data["refresh_token"]) if token_data.get("refresh_token") else None
            ),
            token_expires_at=expires_at,
            status="connected",
            scopes=SCOPES_BY_PROVIDER.get(provider, []),
            metadata_={"email": token_data.get("email", ""), "name": token_data.get("name", "")},
            created_at=now,
            updated_at=now,
        )
    else:
        cred.access_token_encrypted = encrypt_token(token_data["access_token"])
        if token_data.get("refresh_token"):
            cred.refresh_token_encrypted = encrypt_token(token_data["refresh_token"])
        cred.token_expires_at = expires_at
        cred.status = "connected"
        cred.scopes = SCOPES_BY_PROVIDER.get(provider, [])
        cred.metadata_ = {"email": token_data.get("email", ""), "name": token_data.get("name", "")}
        cred.updated_at = now

    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


async def get_valid_access_token(user_id: uuid.UUID, db, provider: str) -> Optional[str]:
    result = await db.execute(
        select(IntegrationCredential).where(IntegrationCredential.user_id == user_id).where(IntegrationCredential.provider == provider)
    )
    cred = result.scalar_one_or_none()
    if not cred or cred.status != "connected" or not cred.access_token_encrypted:
        return None

    now = datetime.now(timezone.utc)
    if cred.token_expires_at and cred.token_expires_at.replace(tzinfo=timezone.utc) <= now + timedelta(minutes=5):
        if not cred.refresh_token_encrypted:
            cred.status = "expired"
            cred.updated_at = now
            db.add(cred)
            await db.commit()
            return None
        try:
            new_tokens = await refresh_access_token(provider, cred.refresh_token_encrypted)
            cred.access_token_encrypted = encrypt_token(new_tokens["access_token"])
            cred.token_expires_at = now + timedelta(seconds=new_tokens["expires_in"])
            cred.updated_at = now
            db.add(cred)
            await db.commit()
            logger.info("Refreshed %s access token", provider)
        except Exception:
            logger.exception("Failed to refresh %s token", provider)
            cred.status = "expired"
            cred.updated_at = now
            db.add(cred)
            await db.commit()
            return None

    return decrypt_token(cred.access_token_encrypted)
