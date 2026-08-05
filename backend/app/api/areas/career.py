import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select, desc

from app.core.deps import get_current_user, get_db
from app.models.career import CareerEvent, SkillInventory, JobOpportunity, CareerJournalEntry

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


# ── Journal ───────────────────────────────────────────────────────────────────
# Dated written reflections. Added 2026-08-01 for the redesign's
# Career -> Journal destination.

# Theme keywords, checked case-insensitively against the entry body. Keyword
# matching rather than an LLM pass on purpose — see the note on the model.
_THEME_KEYWORDS: dict[str, tuple[str, ...]] = {
    "leadership": ("lead", "mentor", "delegat", "1:1", "one-on-one", "manage"),
    "shipping": ("ship", "launch", "release", "deploy", "merged"),
    "learning": ("learn", "read", "course", "studied", "tutorial", "docs"),
    "interviewing": ("interview", "screen", "offer", "recruiter", "onsite"),
    "architecture": ("architect", "design doc", "rfc", "refactor", "system design"),
    "collaboration": ("pair", "review", "feedback", "stakeholder", "cross-team"),
    "wellbeing": ("burnout", "tired", "overwhelm", "rest", "balance", "energy"),
    "impact": ("impact", "metric", "revenue", "adoption", "retention"),
}


def _derive_tags(body: str) -> str:
    lowered = body.lower()
    hits = [theme for theme, words in _THEME_KEYWORDS.items() if any(w in lowered for w in words)]
    return ",".join(hits)


class JournalCreate(BaseModel):
    body: str
    title: Optional[str] = None
    entry_date: Optional[date] = None


class JournalUpdate(BaseModel):
    body: Optional[str] = None
    title: Optional[str] = None
    entry_date: Optional[date] = None


async def _owned_entry(db, entry_id: uuid.UUID, user_id: uuid.UUID) -> CareerJournalEntry:
    result = await db.execute(
        select(CareerJournalEntry).where(
            CareerJournalEntry.id == entry_id,
            CareerJournalEntry.user_id == user_id,
        )
    )
    entry = result.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
    return entry


@router.get("/journal")
async def list_journal(
    limit: int = 50,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    limit = min(max(limit, 1), 200)
    result = await db.execute(
        select(CareerJournalEntry)
        .where(CareerJournalEntry.user_id == current_user.id)
        .order_by(desc(CareerJournalEntry.entry_date), desc(CareerJournalEntry.created_at))
        .limit(limit)
    )
    return result.scalars().all()


@router.get("/journal/stats")
async def journal_stats(current_user=Depends(get_current_user), db=Depends(get_db)):
    """
    Counts the Journal page header needs: this month's volume, the current
    consecutive-day writing streak, and theme frequency across the month.
    """
    today = date.today()
    month_start = today.replace(day=1)

    result = await db.execute(
        select(CareerJournalEntry)
        .where(CareerJournalEntry.user_id == current_user.id)
        .order_by(desc(CareerJournalEntry.entry_date))
    )
    entries = result.scalars().all()

    this_month = [e for e in entries if e.entry_date >= month_start]

    # Streak counts back from today; a gap of one day ends it. Writing twice in
    # a day is still one day, hence the set.
    written_days = {e.entry_date for e in entries}
    streak = 0
    cursor = today
    if cursor not in written_days:
        # Yesterday still counts — today may simply not be written yet.
        cursor = today - timedelta(days=1)
    while cursor in written_days:
        streak += 1
        cursor -= timedelta(days=1)

    theme_counts: dict[str, int] = {}
    for e in this_month:
        for tag in (e.tags or "").split(","):
            if tag:
                theme_counts[tag] = theme_counts.get(tag, 0) + 1

    return {
        "total_entries": len(entries),
        "entries_this_month": len(this_month),
        "words_this_month": sum(e.word_count for e in this_month),
        "streak_days": streak,
        "themes": [
            {"tag": t, "count": n}
            for t, n in sorted(theme_counts.items(), key=lambda kv: -kv[1])
        ],
    }


@router.post("/journal")
async def create_journal_entry(
    body: JournalCreate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    text = body.body.strip()
    if not text:
        raise HTTPException(status_code=422, detail="Entry body cannot be empty")

    entry = CareerJournalEntry(
        user_id=current_user.id,
        entry_date=body.entry_date or date.today(),
        body=text,
        title=body.title,
        tags=_derive_tags(text),
        word_count=len(text.split()),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/journal/{entry_id}")
async def update_journal_entry(
    entry_id: uuid.UUID,
    body: JournalUpdate,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    entry = await _owned_entry(db, entry_id, current_user.id)
    payload = body.model_dump(exclude_unset=True)

    if "body" in payload:
        text = (payload["body"] or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Entry body cannot be empty")
        entry.body = text
        entry.tags = _derive_tags(text)
        entry.word_count = len(text.split())
    if "title" in payload:
        entry.title = payload["title"]
    if "entry_date" in payload and payload["entry_date"]:
        entry.entry_date = payload["entry_date"]

    entry.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/journal/{entry_id}")
async def delete_journal_entry(
    entry_id: uuid.UUID,
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    entry = await _owned_entry(db, entry_id, current_user.id)
    await db.delete(entry)
    await db.commit()
    return {"ok": True}


# ── Learning resources ────────────────────────────────────────────────────────
# Career could record that learning happened (a CareerEvent line of text) but
# not what was being learned or how far through it you were. `skill_id` is what
# turns a `day_0` skill from a label into a plan.
from app.models.career import LearningResource, EmploymentRole

_LEARNING_STATUSES = {"planned", "in_progress", "completed", "abandoned"}
_LEARNING_KINDS = {"course", "book", "article", "video", "other"}


class LearningIn(BaseModel):
    title: str
    kind: str = "course"
    provider: Optional[str] = None
    url: Optional[str] = None
    status: str = "planned"
    progress_pct: int = 0
    skill_id: Optional[uuid.UUID] = None
    started_at: Optional[date] = None
    completed_at: Optional[date] = None
    notes: Optional[str] = None


def _learning_payload(r: LearningResource, skill_names: dict) -> dict:
    return {
        "id": str(r.id), "title": r.title, "kind": r.kind, "provider": r.provider,
        "url": r.url, "status": r.status, "progress_pct": r.progress_pct,
        "skill_id": str(r.skill_id) if r.skill_id else None,
        "skill_name": skill_names.get(r.skill_id),
        "started_at": r.started_at.isoformat() if r.started_at else None,
        "completed_at": r.completed_at.isoformat() if r.completed_at else None,
        "notes": r.notes,
    }


async def _skill_names(db, user_id) -> dict:
    rows = (await db.execute(select(SkillInventory).where(SkillInventory.user_id == user_id))).scalars().all()
    return {s.id: s.skill_name for s in rows}


async def _apply_learning(db, user_id, r: LearningResource, body: LearningIn) -> None:
    title = body.title.strip()
    if not title:
        raise HTTPException(status_code=422, detail="Title is required")
    if body.status not in _LEARNING_STATUSES:
        raise HTTPException(status_code=422, detail=f"status must be one of {sorted(_LEARNING_STATUSES)}")
    if body.kind not in _LEARNING_KINDS:
        raise HTTPException(status_code=422, detail=f"kind must be one of {sorted(_LEARNING_KINDS)}")
    if body.skill_id is not None:
        owned = (await db.execute(
            select(SkillInventory)
            .where(SkillInventory.user_id == user_id)
            .where(SkillInventory.id == body.skill_id)
        )).scalars().first()
        if not owned:
            raise HTTPException(status_code=404, detail="Skill not found")

    r.title = title
    r.kind = body.kind
    r.provider = (body.provider or "").strip() or None
    r.url = (body.url or "").strip() or None
    r.status = body.status
    r.progress_pct = max(0, min(100, body.progress_pct))
    r.skill_id = body.skill_id
    r.started_at = body.started_at
    r.completed_at = body.completed_at
    r.notes = body.notes
    # Completing a resource means 100% — leaving a "completed" row at 40% would
    # make every progress roll-up wrong.
    if r.status == "completed":
        r.progress_pct = 100
        r.completed_at = r.completed_at or date.today()
    r.updated_at = datetime.utcnow()


@router.get("/learning")
async def list_learning(current_user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(
        select(LearningResource)
        .where(LearningResource.user_id == current_user.id)
        .order_by(desc(LearningResource.updated_at))
    )).scalars().all()
    names = await _skill_names(db, current_user.id)
    return [_learning_payload(r, names) for r in rows]


@router.post("/learning")
async def create_learning(body: LearningIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    r = LearningResource(user_id=current_user.id, title=body.title.strip() or "Untitled")
    await _apply_learning(db, current_user.id, r, body)
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _learning_payload(r, await _skill_names(db, current_user.id))


@router.patch("/learning/{resource_id}")
async def update_learning(resource_id: uuid.UUID, body: LearningIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    r = (await db.execute(
        select(LearningResource)
        .where(LearningResource.user_id == current_user.id)
        .where(LearningResource.id == resource_id)
    )).scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    await _apply_learning(db, current_user.id, r, body)
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _learning_payload(r, await _skill_names(db, current_user.id))


@router.delete("/learning/{resource_id}")
async def delete_learning(resource_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    r = (await db.execute(
        select(LearningResource)
        .where(LearningResource.user_id == current_user.id)
        .where(LearningResource.id == resource_id)
    )).scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Learning resource not found")
    await db.delete(r)
    await db.commit()
    return {"status": "deleted"}


# ── Employment history ────────────────────────────────────────────────────────
_EMPLOYMENT_TYPES = {"full_time", "part_time", "contract", "freelance", "internship"}


class RoleIn(BaseModel):
    company: str
    title: str
    employment_type: str = "full_time"
    location: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    description: Optional[str] = None


def _role_payload(r: EmploymentRole) -> dict:
    return {
        "id": str(r.id), "company": r.company, "title": r.title,
        "employment_type": r.employment_type, "location": r.location,
        "start_date": r.start_date.isoformat(),
        "end_date": r.end_date.isoformat() if r.end_date else None,
        # Derived, never stored — one source of truth for "am I still there".
        "is_current": r.end_date is None,
        "months": _months_between(r.start_date, r.end_date or date.today()),
        "description": r.description,
    }


def _months_between(start: date, end: date) -> int:
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def _validate_role(body: RoleIn) -> None:
    if not body.company.strip():
        raise HTTPException(status_code=422, detail="Company is required")
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="Title is required")
    if body.employment_type not in _EMPLOYMENT_TYPES:
        raise HTTPException(status_code=422, detail=f"employment_type must be one of {sorted(_EMPLOYMENT_TYPES)}")
    if body.end_date and body.end_date < body.start_date:
        raise HTTPException(status_code=422, detail="End date cannot be before the start date")


@router.get("/roles")
async def list_roles(current_user=Depends(get_current_user), db=Depends(get_db)):
    """Newest first. Current roles (no end date) sort above finished ones."""
    rows = (await db.execute(
        select(EmploymentRole)
        .where(EmploymentRole.user_id == current_user.id)
        .order_by(desc(EmploymentRole.start_date))
    )).scalars().all()
    ordered = sorted(rows, key=lambda r: (r.end_date is not None, -r.start_date.toordinal()))
    return [_role_payload(r) for r in ordered]


@router.post("/roles")
async def create_role(body: RoleIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    _validate_role(body)
    r = EmploymentRole(
        user_id=current_user.id, company=body.company.strip(), title=body.title.strip(),
        employment_type=body.employment_type, location=(body.location or "").strip() or None,
        start_date=body.start_date, end_date=body.end_date, description=body.description,
    )
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _role_payload(r)


@router.patch("/roles/{role_id}")
async def update_role(role_id: uuid.UUID, body: RoleIn, current_user=Depends(get_current_user), db=Depends(get_db)):
    r = (await db.execute(
        select(EmploymentRole)
        .where(EmploymentRole.user_id == current_user.id)
        .where(EmploymentRole.id == role_id)
    )).scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    _validate_role(body)
    r.company = body.company.strip()
    r.title = body.title.strip()
    r.employment_type = body.employment_type
    r.location = (body.location or "").strip() or None
    r.start_date = body.start_date
    r.end_date = body.end_date
    r.description = body.description
    r.updated_at = datetime.utcnow()
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return _role_payload(r)


@router.delete("/roles/{role_id}")
async def delete_role(role_id: uuid.UUID, current_user=Depends(get_current_user), db=Depends(get_db)):
    r = (await db.execute(
        select(EmploymentRole)
        .where(EmploymentRole.user_id == current_user.id)
        .where(EmploymentRole.id == role_id)
    )).scalars().first()
    if not r:
        raise HTTPException(status_code=404, detail="Role not found")
    await db.delete(r)
    await db.commit()
    return {"status": "deleted"}
