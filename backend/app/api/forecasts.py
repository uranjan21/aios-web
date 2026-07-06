from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.forecast import Forecast
from app.models.user import User
from app.services.ai.forecast_engine import generate_domain_forecast

router = APIRouter(prefix="/api/forecasts", tags=["forecasts"])

class ForecastGenerateReq(BaseModel):
    domain: str

@router.post("/generate", response_model=Forecast)
async def generate_forecast(
    body: ForecastGenerateReq,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    try:
        forecast = await generate_domain_forecast(current_user.id, body.domain, db)
        return forecast
    except ValueError as e:
        # Unknown domain / not enough data — a client-visible condition, not a server fault.
        raise HTTPException(status_code=422, detail=str(e))

@router.get("", response_model=List[Forecast])
async def list_forecasts(
    domain: str = None,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    query = select(Forecast).where(Forecast.user_id == current_user.id)
    if domain:
        query = query.where(Forecast.domain == domain)
    
    query = query.order_by(desc(Forecast.created_at))
    
    result = await db.execute(query)
    return result.scalars().all()
