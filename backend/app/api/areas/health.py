from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.health import HealthLog

router = APIRouter(prefix="/api/areas/health", tags=["health"])


@router.get("/logs")
async def list_logs(
    entry_type: Optional[str] = None,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    result = await db.execute(select(HealthLog).order_by(desc(HealthLog.logged_at)).limit(200))
    logs = result.scalars().all()
    if entry_type:
        logs = [l for l in logs if l.entry_type == entry_type]
    return logs


class HealthLogCreate(BaseModel):
    entry_type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    logged_at: Optional[datetime] = None


@router.post("/logs")
async def create_log(body: HealthLogCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    log = HealthLog(
        logged_at=body.logged_at or datetime.utcnow(),
        entry_type=body.entry_type,
        value=body.value,
        unit=body.unit,
        notes=body.notes,
        source="manual",
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


@router.get("/streak")
async def gym_streak(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "gym")
        .order_by(desc(HealthLog.logged_at))
        .limit(100)
    )
    gym_logs = result.scalars().all()

    if not gym_logs:
        return {"current_streak": 0, "longest_streak": 0, "last_workout_at": None}

    from datetime import date, timedelta
    dates = sorted({l.logged_at.date() for l in gym_logs}, reverse=True)
    last_workout_at = dates[0].isoformat() if dates else None

    current_streak = 0
    today = date.today()
    check = today
    for d in dates:
        if d >= check - timedelta(days=1):
            current_streak += 1
            check = d
        else:
            break

    return {
        "current_streak": current_streak,
        "longest_streak": current_streak,  # simplified
        "last_workout_at": last_workout_at,
    }


@router.get("/summary")
async def health_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(
        select(HealthLog)
        .where(HealthLog.entry_type == "weight")
        .order_by(desc(HealthLog.logged_at))
        .limit(1)
    )
    latest_weight = result.scalar_one_or_none()
    return {
        "weight": float(latest_weight.value) if latest_weight and latest_weight.value else None,
        "weight_unit": latest_weight.unit if latest_weight else "kg",
        "last_measured_at": latest_weight.logged_at.isoformat() if latest_weight else None,
    }
