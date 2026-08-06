import uuid
from typing import List, Optional
from datetime import date, datetime, time, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.workspace import Project, Sprint, Task, Milestone, PlanBlock
from app.models.goal import MacroGoal
from sqlalchemy import func

router = APIRouter(prefix="/api/workspace", tags=["workspace"])

# ── Create schemas ────────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    status: Optional[str] = "active"
    priority: Optional[str] = "medium"
    color: Optional[str] = None
    due_date: Optional[date] = None
    labels: Optional[str] = None

class SprintCreate(BaseModel):
    project_id: uuid.UUID
    name: str
    goals: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = "planned"
    capacity: Optional[int] = None

class MilestoneCreate(BaseModel):
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    status: Optional[str] = "upcoming"
    position: Optional[int] = 0

class MilestoneUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    position: Optional[int] = None

class TaskCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    sprint_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = "todo"
    priority: Optional[str] = "medium"
    due_date: Optional[date] = None
    labels: Optional[str] = None

# ── Update schemas (all fields optional) ──────────────────────────────────────

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    color: Optional[str] = None
    due_date: Optional[date] = None
    labels: Optional[str] = None

class SprintUpdate(BaseModel):
    name: Optional[str] = None
    goals: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    status: Optional[str] = None
    project_id: Optional[uuid.UUID] = None
    capacity: Optional[int] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    domain: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[date] = None
    project_id: Optional[uuid.UUID] = None
    sprint_id: Optional[uuid.UUID] = None
    goal_id: Optional[uuid.UUID] = None
    labels: Optional[str] = None

# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_owned(db: AsyncSession, model, obj_id: uuid.UUID, user_id: uuid.UUID, label: str):
    obj = await db.get(model, obj_id)
    if not obj or obj.user_id != user_id:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return obj

def _check_goal_domain(goal: MacroGoal, domain: Optional[str]) -> None:
    """A linked goal must belong to the same domain as the project/task."""
    if goal.category != (domain or "general"):
        raise HTTPException(
            status_code=422,
            detail=f"Linked goal belongs to the '{goal.category}' domain, not '{domain or 'general'}'",
        )

def _reject_nulls(payload: dict, fields: tuple) -> None:
    """422 when a PATCH explicitly nulls a column that is NOT NULL in the DB."""
    for f in fields:
        if f in payload and payload[f] is None:
            raise HTTPException(status_code=422, detail=f"{f} cannot be null")

# ── Project endpoints ─────────────────────────────────────────────────────────

@router.get("/projects", response_model=List[Project])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/projects", response_model=Project)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if data.goal_id:
        goal = await _get_owned(db, MacroGoal, data.goal_id, current_user.id, "Goal")
        _check_goal_domain(goal, data.domain)
    project = Project(**data.model_dump(), user_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project

@router.patch("/projects/{project_id}", response_model=Project)
async def update_project(
    project_id: uuid.UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_owned(db, Project, project_id, current_user.id, "Project")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("name", "status"))

    # Validate goal↔domain consistency only when the request touches either
    # field, so unrelated PATCHes on legacy rows keep working.
    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", project.goal_id)
        eff_domain = payload.get("domain", project.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(project, k, v)
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    return project

@router.delete("/projects/{project_id}")
async def delete_project(
    project_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    project = await _get_owned(db, Project, project_id, current_user.id, "Project")
    await db.delete(project)
    await db.commit()
    return {"ok": True}

# ── Sprint endpoints ──────────────────────────────────────────────────────────

@router.get("/sprints", response_model=List[Sprint])
async def list_sprints(
    project_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Sprint).where(Sprint.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Sprint.project_id == project_id)
    stmt = stmt.order_by(Sprint.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

@router.post("/sprints", response_model=Sprint)
async def create_sprint(
    data: SprintCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await _get_owned(db, Project, data.project_id, current_user.id, "Project")
    sprint = Sprint(**data.model_dump(), user_id=current_user.id)
    db.add(sprint)
    await db.commit()
    await db.refresh(sprint)
    return sprint

@router.patch("/sprints/{sprint_id}", response_model=Sprint)
async def update_sprint(
    sprint_id: uuid.UUID,
    data: SprintUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sprint = await _get_owned(db, Sprint, sprint_id, current_user.id, "Sprint")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("name", "status", "project_id"))
    if payload.get("project_id"):
        await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")
    for k, v in payload.items():
        setattr(sprint, k, v)
    sprint.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(sprint)
    return sprint

@router.delete("/sprints/{sprint_id}")
async def delete_sprint(
    sprint_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    sprint = await _get_owned(db, Sprint, sprint_id, current_user.id, "Sprint")
    await db.delete(sprint)
    await db.commit()
    return {"ok": True}

# ── Task endpoints ────────────────────────────────────────────────────────────

@router.get("/tasks", response_model=List[Task])
async def list_tasks(
    project_id: Optional[uuid.UUID] = None,
    sprint_id: Optional[uuid.UUID] = None,
    domain: Optional[str] = None,
    goal_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Task).where(Task.user_id == current_user.id)
    if project_id:
        stmt = stmt.where(Task.project_id == project_id)
    if sprint_id:
        stmt = stmt.where(Task.sprint_id == sprint_id)
    if domain:
        stmt = stmt.where(Task.domain == domain)
    if goal_id:
        stmt = stmt.where(Task.goal_id == goal_id)
    stmt = stmt.order_by(Task.created_at.desc())
    result = await db.execute(stmt)
    return result.scalars().all()

class WorkspaceStats(BaseModel):
    projects_count: int
    sprints_count: int
    tasks_count: int
    goals_count: int

@router.get("/stats", response_model=WorkspaceStats)
async def get_workspace_stats(
    domain: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    p_stmt = select(func.count()).select_from(Project).where(
        Project.user_id == current_user.id, Project.status == "active"
    )
    if domain:
        p_stmt = p_stmt.where(Project.domain == domain)
    p_count = (await db.execute(p_stmt)).scalar() or 0

    # Sprints have no domain column — derive it from the parent project.
    s_stmt = select(func.count()).select_from(Sprint).where(
        Sprint.user_id == current_user.id, Sprint.status.in_(["planned", "active"])
    )
    if domain:
        s_stmt = s_stmt.join(Project, Sprint.project_id == Project.id).where(Project.domain == domain)
    s_count = (await db.execute(s_stmt)).scalar() or 0

    t_stmt = select(func.count()).select_from(Task).where(
        Task.user_id == current_user.id, Task.status != "done"
    )
    if domain:
        t_stmt = t_stmt.where(Task.domain == domain)
    t_count = (await db.execute(t_stmt)).scalar() or 0

    g_stmt = select(func.count()).select_from(MacroGoal).where(
        MacroGoal.user_id == current_user.id, MacroGoal.status == "active"
    )
    if domain:
        g_stmt = g_stmt.where(MacroGoal.category == domain)
    g_count = (await db.execute(g_stmt)).scalar() or 0

    return WorkspaceStats(projects_count=p_count, sprints_count=s_count, tasks_count=t_count, goals_count=g_count)

@router.post("/tasks", response_model=Task)
async def create_task(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    payload = data.model_dump()

    project = None
    if payload["project_id"]:
        project = await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")

    if payload["sprint_id"]:
        sprint = await _get_owned(db, Sprint, payload["sprint_id"], current_user.id, "Sprint")
        if payload["project_id"] and sprint.project_id != payload["project_id"]:
            raise HTTPException(status_code=422, detail="Sprint belongs to a different project")
        if not payload["project_id"]:
            # A sprint task always belongs to the sprint's project.
            payload["project_id"] = sprint.project_id
            project = await db.get(Project, sprint.project_id)

    if project and project.domain:
        if payload["domain"] is None:
            payload["domain"] = project.domain
        elif (payload["domain"] or "general") != (project.domain or "general"):
            raise HTTPException(status_code=422, detail="Task domain must match its project's domain")

    if payload["goal_id"]:
        goal = await _get_owned(db, MacroGoal, payload["goal_id"], current_user.id, "Goal")
        _check_goal_domain(goal, payload["domain"])

    task = Task(**payload, user_id=current_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task

@router.patch("/tasks/{task_id}", response_model=Task)
async def update_task(
    task_id: uuid.UUID,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await _get_owned(db, Task, task_id, current_user.id, "Task")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("title", "status", "priority"))

    if payload.get("project_id"):
        await _get_owned(db, Project, payload["project_id"], current_user.id, "Project")

    if payload.get("sprint_id"):
        sprint = await _get_owned(db, Sprint, payload["sprint_id"], current_user.id, "Sprint")
        eff_project_id = payload.get("project_id", task.project_id)
        if eff_project_id and sprint.project_id != eff_project_id:
            raise HTTPException(status_code=422, detail="Sprint belongs to a different project")
        if not eff_project_id:
            payload["project_id"] = sprint.project_id

    # Validate goal↔domain consistency only when the request touches either
    # field, so status toggles on legacy rows keep working.
    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", task.goal_id)
        eff_domain = payload.get("domain", task.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(task, k, v)
    task.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
async def delete_task(
    task_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    task = await _get_owned(db, Task, task_id, current_user.id, "Task")
    await db.delete(task)
    await db.commit()
    return {"ok": True}


# ── Milestones ────────────────────────────────────────────────────────────────
# Dated checkpoints on the way to a goal. Added 2026-08-01 for the redesign's
# Workspace -> Milestones destination.

MILESTONE_STATUSES = {"upcoming", "at_risk", "hit", "missed"}


def _check_milestone_status(status: Optional[str]) -> None:
    if status is not None and status not in MILESTONE_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=f"status must be one of {sorted(MILESTONE_STATUSES)}",
        )


@router.get("/milestones", response_model=List[Milestone])
async def list_milestones(
    domain: Optional[str] = None,
    status: Optional[str] = None,
    goal_id: Optional[uuid.UUID] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soonest first. Undated milestones sort last rather than disappearing."""
    query = select(Milestone).where(Milestone.user_id == current_user.id)
    if domain:
        query = query.where(Milestone.domain == domain)
    if status:
        query = query.where(Milestone.status == status)
    if goal_id:
        query = query.where(Milestone.goal_id == goal_id)
    query = query.order_by(Milestone.due_date.is_(None), Milestone.due_date, Milestone.position)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/milestones", response_model=Milestone)
async def create_milestone(
    data: MilestoneCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_milestone_status(data.status)
    if data.goal_id:
        # 404s on another user's goal, and keeps goal<->domain consistent —
        # same contract as projects and tasks.
        goal = await _get_owned(db, MacroGoal, data.goal_id, current_user.id, "Goal")
        _check_goal_domain(goal, data.domain)
    milestone = Milestone(**data.model_dump(), user_id=current_user.id)
    db.add(milestone)
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.patch("/milestones/{milestone_id}", response_model=Milestone)
async def update_milestone(
    milestone_id: uuid.UUID,
    data: MilestoneUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    milestone = await _get_owned(db, Milestone, milestone_id, current_user.id, "Milestone")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("title", "status"))
    _check_milestone_status(payload.get("status"))

    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", milestone.goal_id)
        eff_domain = payload.get("domain", milestone.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(milestone, k, v)
    milestone.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(milestone)
    return milestone


@router.delete("/milestones/{milestone_id}")
async def delete_milestone(
    milestone_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    milestone = await _get_owned(db, Milestone, milestone_id, current_user.id, "Milestone")
    await db.delete(milestone)
    await db.commit()
    return {"ok": True}


# ── Plan blocks ───────────────────────────────────────────────────────────────
# The weekly time-blocking planner behind Today -> Plan. Added 2026-08-01.


class PlanBlockCreate(BaseModel):
    block_date: date
    start_time: time
    end_time: time
    title: str
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    is_priority: Optional[bool] = False


class PlanBlockUpdate(BaseModel):
    block_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    title: Optional[str] = None
    domain: Optional[str] = None
    goal_id: Optional[uuid.UUID] = None
    is_priority: Optional[bool] = None


def _check_block_times(start: Optional[time], end: Optional[time]) -> None:
    if start and end and end <= start:
        raise HTTPException(status_code=422, detail="end_time must be after start_time")


async def _clear_other_priorities(db, user_id: uuid.UUID, on: date, keep_id: Optional[uuid.UUID]) -> None:
    """At most one priority per day — promoting a block demotes the incumbent."""
    result = await db.execute(
        select(PlanBlock).where(
            PlanBlock.user_id == user_id,
            PlanBlock.block_date == on,
            PlanBlock.is_priority == True,  # noqa: E712 — SQL boolean, not Python
        )
    )
    for row in result.scalars().all():
        if row.id != keep_id:
            row.is_priority = False


@router.get("/plan-blocks", response_model=List[PlanBlock])
async def list_plan_blocks(
    start: Optional[date] = None,
    end: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Defaults to the current Monday–Sunday week when no range is given."""
    if start is None:
        today = date.today()
        start = today - timedelta(days=today.weekday())
    if end is None:
        end = start + timedelta(days=6)
    if end < start:
        raise HTTPException(status_code=422, detail="end must not be before start")

    result = await db.execute(
        select(PlanBlock)
        .where(
            PlanBlock.user_id == current_user.id,
            PlanBlock.block_date >= start,
            PlanBlock.block_date <= end,
        )
        .order_by(PlanBlock.block_date, PlanBlock.start_time)
    )
    return result.scalars().all()


@router.post("/plan-blocks", response_model=PlanBlock)
async def create_plan_block(
    data: PlanBlockCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    _check_block_times(data.start_time, data.end_time)
    if data.goal_id:
        goal = await _get_owned(db, MacroGoal, data.goal_id, current_user.id, "Goal")
        _check_goal_domain(goal, data.domain)

    block = PlanBlock(**data.model_dump(), user_id=current_user.id)
    if block.is_priority:
        await _clear_other_priorities(db, current_user.id, block.block_date, None)
    db.add(block)
    await db.commit()
    await db.refresh(block)
    return block


@router.patch("/plan-blocks/{block_id}", response_model=PlanBlock)
async def update_plan_block(
    block_id: uuid.UUID,
    data: PlanBlockUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await _get_owned(db, PlanBlock, block_id, current_user.id, "Plan block")
    payload = data.model_dump(exclude_unset=True)
    _reject_nulls(payload, ("title", "block_date", "start_time", "end_time"))

    _check_block_times(
        payload.get("start_time", block.start_time),
        payload.get("end_time", block.end_time),
    )

    if "goal_id" in payload or "domain" in payload:
        eff_goal_id = payload.get("goal_id", block.goal_id)
        eff_domain = payload.get("domain", block.domain)
        if eff_goal_id:
            goal = await _get_owned(db, MacroGoal, eff_goal_id, current_user.id, "Goal")
            _check_goal_domain(goal, eff_domain)

    for k, v in payload.items():
        setattr(block, k, v)
    if block.is_priority:
        await _clear_other_priorities(db, current_user.id, block.block_date, block.id)

    block.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(block)
    return block


@router.delete("/plan-blocks/{block_id}")
async def delete_plan_block(
    block_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    block = await _get_owned(db, PlanBlock, block_id, current_user.id, "Plan block")
    await db.delete(block)
    await db.commit()
    return {"ok": True}


@router.get("/plan-blocks/calendar")
async def plan_week_calendar(
    start: Optional[date] = None,
    end: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Google Calendar events for the planner's week, as READ-ONLY context.

    The time-blocking planner and the calendar have never talked, so it was
    possible to block deep work straight over a standing meeting. This closes
    the read direction: real commitments show in the grid, and you plan around
    them.

    It is the read direction ONLY, and that is a constraint rather than a
    choice — the Google grant is `calendar.readonly`
    (services/integrations/google_oauth.py). Writing a block back as an event
    needs `calendar.events`, and widening a scope invalidates every existing
    consent, so it is a product decision with a re-connect cost attached, not
    something to slip in.

    Returns `connected: false` rather than an empty list when Calendar was
    never linked — "no meetings this week" and "we cannot see your calendar"
    must not look the same in the UI.
    """
    from app.models.integration import IntegrationCredential
    from app.services.integrations.google_calendar import get_stored_events

    if start is None:
        today = date.today()
        start = today - timedelta(days=today.weekday())
    if end is None:
        end = start + timedelta(days=6)
    if end < start:
        raise HTTPException(status_code=422, detail="end must not be before start")

    linked = (await db.execute(
        select(IntegrationCredential)
        .where(IntegrationCredential.user_id == current_user.id)
        .where(IntegrationCredential.provider == "gcal")
    )).scalars().first()
    if not linked:
        return {"connected": False, "events": []}

    # `date_to` is already widened to 23:59:59 inside get_stored_events, so
    # `end` goes in as-is — adding a day here would pull in the next Monday.
    events = await get_stored_events(
        current_user.id, db,
        date_from=start.isoformat(),
        date_to=end.isoformat(),
    )

    out = []
    for e in events:
        starts = e.get("start_time")
        # No start time means nothing to place on the grid; a cancelled event
        # must not reserve time the user actually has free.
        if not starts or e.get("status") == "cancelled":
            continue
        out.append({
            "id": str(e.get("id")),
            "title": e.get("title") or "(no title)",
            "start_time": starts,
            "end_time": e.get("end_time"),
            "location": e.get("location"),
            # Straight through to the event in Google. There is deliberately no
            # `all_day` here: the column does not exist, and a field that is
            # always False is worse than an absent one.
            "html_link": e.get("html_link"),
        })
    return {"connected": True, "events": out}
