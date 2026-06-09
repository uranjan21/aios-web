from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlmodel import select

from app.core.config import get_settings
from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.core.security import create_access_token
import secrets

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    password: str


class ChangePasswordRequest(BaseModel):
    current: str
    new: str


@router.post("/login")
@limiter.limit("10/minute")
async def login(request: Request, body: LoginRequest, response: Response):
    settings = get_settings()
    if not secrets.compare_digest(body.password, settings.app_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid password")

    token = create_access_token({"sub": "utsav"}, expires_delta=timedelta(days=30))
    response.set_cookie(
        key="aios_token",
        value=token,
        httponly=True,
        samesite="strict",
        secure=False,  # True in production
        max_age=30 * 24 * 3600,
    )
    return {"status": "ok"}


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("aios_token")
    return {"status": "ok"}


@router.get("/me")
async def me(current_user=Depends(get_current_user)):
    return {"user_id": current_user["user_id"]}
