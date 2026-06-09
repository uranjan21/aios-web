from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, constr

from app.core.deps import get_current_user, get_db
from app.models.captures import Capture

router = APIRouter(prefix="/api/captures", tags=["captures"])


class CaptureCreate(BaseModel):
    raw_text: str = constr(min_length=1, max_length=2000)


@router.post("", status_code=201)
async def create_capture(body: CaptureCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    capture = Capture(raw_text=body.raw_text.strip())
    db.add(capture)
    await db.commit()
    await db.refresh(capture)
    return capture


@router.get("")
async def list_captures(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlmodel import select, desc
    result = await db.execute(select(Capture).order_by(desc(Capture.created_at)).limit(50))
    return result.scalars().all()
