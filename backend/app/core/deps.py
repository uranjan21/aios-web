import uuid
from dataclasses import dataclass
from typing import AsyncGenerator, Optional

from fastapi import Cookie, Depends, HTTPException, WebSocket, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.security import decode_access_token
from app.db.session import get_session


@dataclass
class CurrentUser:
    id: uuid.UUID | str
    token: str
    is_admin: bool = False


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


async def get_current_user(
    aios_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not aios_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(aios_token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    try:
        user_id = uuid.UUID(sub)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token claims")

    # Confirm user still exists and token hasn't been revoked (H4).
    from app.models.user import User
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    token_ver = payload.get("ver")
    if token_ver is not None and user.token_version != token_ver:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired — please log in again",
        )

    return CurrentUser(id=user_id, token=aios_token, is_admin=bool(user.is_admin))


def require_admin(current_user=Depends(get_current_user)):
    """Dependency that 403s for non-admin users."""
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user


async def ws_auth(websocket: WebSocket) -> Optional[dict]:
    """Extract and validate JWT from WebSocket cookie. Returns payload dict or None if invalid."""
    token = websocket.cookies.get("aios_token")
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None

    # Mirror get_current_user's revocation check: reject revoked sessions on WS (C-1).
    try:
        from app.models.user import User
        from app.db.session import AsyncSessionLocal
        uid = uuid.UUID(payload["sub"])
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(User).where(User.id == uid))
            user = result.scalar_one_or_none()
        if not user:
            return None
        token_ver = payload.get("ver")
        if token_ver is not None and user.token_version != token_ver:
            return None
    except Exception:
        return None

    return payload
