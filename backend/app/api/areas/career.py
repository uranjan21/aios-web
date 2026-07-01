from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.career import CareerEvent, SkillInventory, JobOpportunity

router = APIRouter(prefix="/api/areas/career", tags=["career"])


@router.get("/skills")
async def list_skills(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(SkillInventory).where(SkillInventory.user_id == current_user.id).order_by(SkillInventory.skill_name))
    return result.scalars().all()


class SkillUpsert(BaseModel):
    skill_name: str
    category: str
    level: str
    notes: Optional[str] = None


class SkillUpdate(BaseModel):
    category: Optional[str] = None
    level: str
    notes: Optional[str] = None


@router.post("/skills")
async def upsert_skill(body: SkillUpsert, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(SkillInventory).where(SkillInventory.user_id == current_user.id).where(SkillInventory.skill_name == body.skill_name))
    skill = result.scalar_one_or_none()
    if skill:
        skill.level = body.level
        skill.category = body.category
        if body.notes is not None:
            skill.notes = body.notes
        skill.last_updated = datetime.utcnow()
    else:
        skill = SkillInventory(user_id=current_user.id, skill_name=body.skill_name, category=body.category, level=body.level, notes=body.notes)
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


@router.put("/skills/{skill_id}")
async def update_skill(skill_id: str, body: SkillUpdate, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(SkillInventory).where(SkillInventory.user_id == current_user.id).where(SkillInventory.id == skill_id))
    skill = result.scalar_one_or_none()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill.level = body.level
    if body.notes is not None:
        skill.notes = body.notes
    skill.last_updated = datetime.utcnow()
    db.add(skill)
    await db.commit()
    await db.refresh(skill)
    return skill


@router.get("/events")
async def list_events(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(CareerEvent).where(CareerEvent.user_id == current_user.id).order_by(desc(CareerEvent.occurred_at)).limit(100))
    return result.scalars().all()


class CareerEventCreate(BaseModel):
    event_type: str
    title: str
    description: Optional[str] = None
    skill: Optional[str] = None
    skill_level: Optional[str] = None
    occurred_at: Optional[datetime] = None


@router.post("/events")
async def create_event(body: CareerEventCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    event = CareerEvent(
        user_id=current_user.id,
        occurred_at=body.occurred_at or datetime.utcnow(),
        event_type=body.event_type,
        title=body.title,
        description=body.description,
        skill=body.skill,
        skill_level=body.skill_level,
        source="manual",
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


@router.get("/summary")
async def get_summary(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlalchemy import func as sa_func
    total_skills = (await db.execute(select(sa_func.count(SkillInventory.id)).where(SkillInventory.user_id == current_user.id))).scalar_one()

    latest_skill = (await db.execute(
        select(SkillInventory).where(SkillInventory.user_id == current_user.id).order_by(desc(SkillInventory.last_updated)).limit(1)
    )).scalar_one_or_none()

    latest_event = (await db.execute(
        select(CareerEvent).where(CareerEvent.user_id == current_user.id).order_by(desc(CareerEvent.occurred_at)).limit(1)
    )).scalar_one_or_none()

    return {
        "total_skills": total_skills,
        "last_skill_update": latest_skill.last_updated.isoformat() if latest_skill else None,
        "last_event_title": latest_event.title if latest_event else None,
        "last_event_at": latest_event.occurred_at.isoformat() if latest_event else None,
    }


@router.get("/roadmap")
async def get_roadmap(current_user=Depends(get_current_user)):
    from app.core.config import get_settings
    from app.services.vault_sync.writer import VaultWriteGuard
    settings = get_settings()
    guard = VaultWriteGuard(settings.vault_path)
    content = guard.read_file("03-career/context.md")
    return {"raw_context": content[:3000] if content else None}


# ── Job Opportunities ───────────────────────────────────────────

@router.get("/opportunities")
async def list_opportunities(current_user=Depends(get_current_user), db=Depends(get_db)):
    from sqlmodel import asc
    result = await db.execute(
        select(JobOpportunity).where(JobOpportunity.user_id == current_user.id).order_by(desc(JobOpportunity.created_at)).limit(100)
    )
    return result.scalars().all()


VALID_OPPORTUNITY_STATUS = {"prospect", "applied", "screening", "interview", "offer", "rejected", "closed"}


class OpportunityCreate(BaseModel):
    company: str
    role: str
    status: str = "prospect"
    applied_date: Optional[datetime] = None
    notes: Optional[str] = None
    url: Optional[str] = None


class OpportunityPatch(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    url: Optional[str] = None
    applied_date: Optional[datetime] = None


@router.post("/opportunities")
async def create_opportunity(body: OpportunityCreate, current_user=Depends(get_current_user), db=Depends(get_db)):
    if body.status not in VALID_OPPORTUNITY_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_OPPORTUNITY_STATUS))}")
    opp = JobOpportunity(user_id=current_user.id, **body.model_dump())
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp


@router.patch("/opportunities/{opp_id}")
async def patch_opportunity(opp_id: str, body: OpportunityPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(JobOpportunity).where(JobOpportunity.user_id == current_user.id).where(JobOpportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in VALID_OPPORTUNITY_STATUS:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_OPPORTUNITY_STATUS))}")
    for field, value in data.items():
        setattr(opp, field, value)
    opp.updated_at = datetime.utcnow()
    db.add(opp)
    await db.commit()
    await db.refresh(opp)
    return opp


@router.delete("/opportunities/{opp_id}")
async def delete_opportunity(opp_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(JobOpportunity).where(JobOpportunity.user_id == current_user.id).where(JobOpportunity.id == opp_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    await db.delete(opp)
    await db.commit()
    return {"status": "deleted"}
