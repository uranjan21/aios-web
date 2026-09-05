"""Admin-only endpoints — user management, system overview."""
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlmodel import select, func

from app.core.deps import get_db, require_admin
from app.core.rate_limit import limiter
from app.models.user import User
from app.models.admin_audit import AdminAuditLog
import json

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/admin", tags=["admin"])

# ── Helpers ────────────────────────────────────────────────────────────────────

def _user_row(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "picture_url": user.picture_url,
        "auth_provider": user.auth_provider,
        "is_admin": bool(user.is_admin),
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/users")
@limiter.limit("30/minute")
async def list_users(
    request: Request,
    _=Depends(require_admin),
    db=Depends(get_db),
    search: str = "",
    limit: int = 50,
    offset: int = 0,
):
    """List all users. Admin only."""
    query = select(User)
    if search:
        term = f"%{search.lower()}%"
        from sqlalchemy import or_, func as sa_func
        query = query.where(
            or_(
                sa_func.lower(User.email).like(term),
                sa_func.lower(User.name).like(term),
            )
        )
    query = query.order_by(User.created_at.desc()).offset(offset).limit(limit)
    users = (await db.execute(query)).scalars().all()

    total = (await db.execute(select(func.count()).select_from(User))).scalar_one()

    return {
        "users": [_user_row(u) for u in users],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


class AdminToggle(BaseModel):
    is_admin: bool


@router.patch("/users/{user_id}/admin")
@limiter.limit("20/minute")
async def toggle_admin(
    request: Request,
    user_id: uuid.UUID,
    body: AdminToggle,
    current_admin=Depends(require_admin),
    db=Depends(get_db),
):
    """Grant or revoke admin privileges. Cannot revoke your own admin."""
    if str(user_id) == str(current_admin.id):
        raise HTTPException(400, "Cannot change your own admin status")

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")

    user.is_admin = body.is_admin
    user.updated_at = datetime.utcnow()
    db.add(user)
    
    audit = AdminAuditLog(
        admin_id=current_admin.id,
        action="toggle_admin",
        target_user_id=user_id,
        details=json.dumps({"is_admin": body.is_admin})
    )
    db.add(audit)

    await db.commit()
    await db.refresh(user)
    return _user_row(user)


@router.delete("/users/{user_id}")
@limiter.limit("10/minute")
async def admin_delete_user(
    request: Request,
    user_id: uuid.UUID,
    current_admin=Depends(require_admin),
    db=Depends(get_db),
):
    """Hard-delete a user and all their data. Admin only."""
    if str(user_id) == str(current_admin.id):
        raise HTTPException(400, "Cannot delete yourself")

    from sqlalchemy import text
    import app.models  # noqa — register all models in metadata
    from sqlmodel import SQLModel

    existing = {
        row[0]
        for row in (
            await db.execute(text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"))
        ).all()
    }
    for table in reversed(SQLModel.metadata.sorted_tables):
        if table.name == "users":
            continue
        if "user_id" not in table.columns:
            continue
        if table.name not in existing:
            continue
        await db.execute(text(f'DELETE FROM "{table.name}" WHERE user_id = :uid'), {"uid": str(user_id)})

    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user:
        await db.delete(user)
        
    audit = AdminAuditLog(
        admin_id=current_admin.id,
        action="delete_user",
        target_user_id=user_id,
        details=json.dumps({"deleted_email": user.email if user else "unknown"})
    )
    db.add(audit)

    await db.commit()
    return {"status": "deleted", "user_id": str(user_id)}


@router.get("/stats")
@limiter.limit("30/minute")
async def system_stats(request: Request, _=Depends(require_admin), db=Depends(get_db)):
    """Quick system overview for the admin dashboard."""
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar_one()

    return {"total_users": total_users}
