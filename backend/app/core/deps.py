import uuid
from typing import AsyncGenerator, Optional

from fastapi import Cookie, Depends, HTTPException, WebSocket, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.db.session import get_session


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


async def get_current_user(
    aios_token: str | None = Cookie(default=None),
    db: AsyncSession = Depends(get_db),
):
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
        user_id = sub

    return {"user_id": user_id, "token": aios_token}


async def ws_auth(websocket: WebSocket) -> Optional[dict]:
    """Extract and validate JWT from WebSocket cookie. Returns user dict or None if invalid."""
    token = websocket.cookies.get("aios_token")
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        return None
    return payload
