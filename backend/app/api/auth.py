import secrets
import uuid
from datetime import datetime, timedelta
from urllib.parse import urlencode

import re

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, field_validator
from sqlmodel import select

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _validate_email(value: str) -> str:
    email = value.strip().lower()
    if not _EMAIL_RE.match(email):
        raise ValueError("Invalid email address")
    return email

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.user import User
from app.models.oauth_state import OAuthState
from app.services.integrations.google_oauth import (
    GOOGLE_AUTH_URL,
    GOOGLE_TOKEN_URL,
    GOOGLE_USERINFO_URL,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── Helpers ─────────────────────────────────────────────────────────────

def _issue_cookie(response: Response, user_id: str, token_version: int = 1):
    settings = get_settings()
    token = create_access_token(
        {"sub": user_id, "ver": token_version},
        expires_delta=timedelta(days=30),
    )
    response.set_cookie(
        key="aios_token",
        value=token,
        httponly=True,
        samesite="strict",
        secure=settings.environment == "production",
        max_age=30 * 24 * 3600,
    )


def _user_dict(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
        "auth_provider": user.auth_provider,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ── Email / password login ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response, db=Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email.strip().lower()))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        # Fallback: legacy env-var credentials — DEV ONLY. Never honored in production
        # so a forgotten APP_EMAIL/APP_PASSWORD can't become a live admin backdoor.
        settings = get_settings()
        if (
            settings.environment != "production"
            and secrets.compare_digest(body.email, settings.app_email)
            and secrets.compare_digest(body.password, settings.app_password)
        ):
            user = await _get_or_create_legacy_user(db, settings)
        else:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}


async def _get_or_create_legacy_user(db, settings) -> User:
    """Find or create a user row for the legacy env-var credentials."""
    result = await db.execute(select(User).where(User.email == settings.app_email))
    user = result.scalar_one_or_none()
    if user:
        return user
    user = User(
        email=settings.app_email,
        name="Admin",
        auth_provider="email",
        password_hash=hash_password(settings.app_password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Email / password signup ─────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    name: str
    password: str

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        return _validate_email(v)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        name = v.strip()
        if not name:
            raise ValueError("Name is required")
        return name

    @field_validator("password")
    @classmethod
    def _password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/signup")
@limiter.limit("5/minute")
async def signup(request: Request, body: SignupRequest, response: Response, db=Depends(get_db)):
    email = body.email.strip().lower()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=email,
        name=body.name.strip(),
        auth_provider="email",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _seed_new_user(user.id)

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}


async def _seed_new_user(user_id) -> None:
    """Provision a new user (default agents + free subscription). Non-fatal on failure."""
    try:
        from app.api.agents import seed_default_agents_for_user
        await seed_default_agents_for_user(user_id)
    except Exception:  # pragma: no cover - provisioning must never block signup
        import logging
        logging.getLogger(__name__).warning("Default agent seeding failed for %s", user_id, exc_info=True)
    try:
        from app.db.session import AsyncSessionLocal
        from app.services.billing.service import get_or_create_subscription
        async with AsyncSessionLocal() as session:
            await get_or_create_subscription(session, user_id)
    except Exception:  # pragma: no cover
        import logging
        logging.getLogger(__name__).warning("Free subscription seeding failed for %s", user_id, exc_info=True)


# ── Logout ──────────────────────────────────────────────────────────────

@router.post("/logout")
async def logout(
    response: Response,
    aios_token: str | None = Cookie(default=None),
    db=Depends(get_db),
):
    response.delete_cookie("aios_token")
    # Increment token_version to revoke all outstanding JWTs for this user (H4).
    if aios_token:
        payload = decode_access_token(aios_token)
        if payload and payload.get("sub"):
            try:
                uid = uuid.UUID(payload["sub"])
                result = await db.execute(select(User).where(User.id == uid))
                user = result.scalar_one_or_none()
                if user:
                    user.token_version += 1
                    user.updated_at = datetime.utcnow()
                    db.add(user)
                    await db.commit()
            except Exception:
                pass  # Never block logout due to revocation errors
    return {"status": "ok"}


# ── Current user ────────────────────────────────────────────────────────

@router.get("/me")
async def me(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return _user_dict(user)


# ── Profile update ──────────────────────────────────────────────────────

class ProfileUpdate(BaseModel):
    name: str | None = None
    picture_url: str | None = None


@router.patch("/profile")
async def update_profile(body: ProfileUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = name
    if body.picture_url is not None:
        user.picture_url = body.picture_url
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return _user_dict(user)


# ── Password change ────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    current: str
    new: str

    @field_validator("new")
    @classmethod
    def _new(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


@router.post("/change-password")
async def change_password(
    body: ChangePasswordRequest,
    response: Response,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == current_user.id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    if not user.password_hash or not verify_password(body.current, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    user.password_hash = hash_password(body.new)
    user.token_version += 1  # revoke all other active sessions (H4)
    user.updated_at = datetime.utcnow()
    db.add(user)
    await db.commit()
    await db.refresh(user)
    # Re-issue cookie with the new token_version so the current session stays valid.
    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok"}


# ── Google OAuth login ──────────────────────────────────────────────────

@router.get("/google/url")
async def google_login_url(db=Depends(get_db)):
    settings = get_settings()
    client_id = settings.gcal_client_id
    if not client_id:
        raise HTTPException(status_code=400, detail="Google OAuth not configured")

    state = secrets.token_urlsafe(32)
    redirect_uri = f"{settings.allowed_origin}/auth/google/callback"

    # Store state in DB so it survives multi-worker / pod-restart scenarios (H3).
    db.add(OAuthState(state=state, provider="auth", created_at=datetime.utcnow()))
    await db.commit()

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
        "state": state,
    }
    return {"url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


class GoogleCallbackBody(BaseModel):
    code: str
    state: str


@router.post("/google/callback")
@limiter.limit("10/minute")
async def google_login_callback(
    request: Request, body: GoogleCallbackBody, response: Response, db=Depends(get_db)
):
    # Validate and consume the state token from DB (H3).
    result = await db.execute(select(OAuthState).where(OAuthState.state == body.state))
    entry = result.scalar_one_or_none()
    if not entry or entry.provider != "auth":
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")
    age = datetime.utcnow() - entry.created_at
    await db.delete(entry)
    await db.commit()
    if age > timedelta(minutes=10):
        raise HTTPException(status_code=400, detail="Invalid or expired OAuth state")

    settings = get_settings()
    redirect_uri = f"{settings.allowed_origin}/auth/google/callback"

    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": body.code,
                "client_id": settings.gcal_client_id,
                "client_secret": settings.gcal_client_secret,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        if token_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Google authentication failed")
        tokens = token_resp.json()

        userinfo_resp = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        if userinfo_resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Failed to get Google profile")
        guser = userinfo_resp.json()

    google_email = (guser.get("email") or "").strip().lower()
    if not google_email:
        raise HTTPException(status_code=401, detail="Google account has no email")

    # Find or create user
    result = await db.execute(select(User).where(User.email == google_email))
    user = result.scalar_one_or_none()

    now = datetime.utcnow()
    if not user:
        user = User(
            email=google_email,
            name=guser.get("name", google_email.split("@")[0]),
            picture_url=guser.get("picture"),
            auth_provider="google",
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        await _seed_new_user(user.id)
    else:
        if guser.get("picture") and user.picture_url != guser["picture"]:
            user.picture_url = guser["picture"]
        if guser.get("name") and not user.name:
            user.name = guser["name"]
        if user.auth_provider == "email":
            user.auth_provider = "google"
        user.updated_at = now
        db.add(user)
        await db.commit()
        await db.refresh(user)

    _issue_cookie(response, str(user.id), user.token_version)
    return {"status": "ok", "user": _user_dict(user)}
