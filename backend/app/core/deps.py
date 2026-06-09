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

    return {"user_id": payload.get("sub", "utsav"), "token": aios_token}


async def ws_auth(websocket: WebSocket) -> Optional[dict]:
    """Extract and validate JWT from WebSocket cookie. Returns user dict or None if invalid."""
    token = websocket.cookies.get("aios_token")
    if not token:
        return None
    return decode_access_token(token)
