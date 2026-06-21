import asyncio
import json
import logging
import uuid
from datetime import datetime
from typing import Set

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from sqlmodel import select

from app.core.deps import get_current_user, get_db
from app.core.rate_limit import limiter
from app.db.session import AsyncSessionLocal
from app.models.agent import Agent

router = APIRouter(prefix="/api/agents", tags=["agents"])
logger = logging.getLogger(__name__)

_agent_subscribers: Set = set()

DEFAULT_AGENTS = [
    {"task_id": "aios-morning-brief", "name": "Morning Brief", "cron_expression": "0 5 * * *", "description": "Generate daily brief from calendar + context"},
    {"task_id": "aios-news-radar", "name": "News Radar", "cron_expression": "0 8 * * *", "description": "Scan and summarize relevant tech news"},
    {"task_id": "aios-weekly-calendar", "name": "Weekly Calendar", "cron_expression": "0 7 * * 1", "description": "Generate LinkedIn calendar content"},
    {"task_id": "aios-career-checkpoint", "name": "Career Checkpoint", "cron_expression": "0 19 * * 5", "description": "Weekly career review and update"},
    {"task_id": "aios-monthly-finance", "name": "Monthly Finance", "cron_expression": "0 9 1 * *", "description": "Monthly finance snapshot generation"},
    {"task_id": "aios-evening-review", "name": "Evening Review", "cron_expression": "0 22 * * *", "description": "Daily evening review and planning"},
    {"task_id": "aios-weekly-refresh", "name": "Weekly Refresh", "cron_expression": "0 20 * * 0", "description": "Weekly goals and context refresh"},
    {"task_id": "aios-content-performance", "name": "Content Performance", "cron_expression": "0 20 * * 5", "description": "Weekly content performance review"},
]


async def seed_default_agents() -> None:
    async with AsyncSessionLocal() as session:
        for agent_data in DEFAULT_AGENTS:
            result = await session.execute(select(Agent).where(Agent.task_id == agent_data["task_id"]))
            if not result.scalar_one_or_none():
                active = agent_data["task_id"] in {
                    "aios-morning-brief", "aios-news-radar",
                    "aios-weekly-calendar", "aios-career-checkpoint", "aios-monthly-finance"
                }
                session.add(Agent(**agent_data, is_active=active))
        await session.commit()


@router.get("")
async def list_agents(current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.user_id == str(current_user.id)))
    return result.scalars().all()


@router.get("/{agent_id}")
async def get_agent(agent_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.task_id == agent_id, Agent.user_id == str(current_user.id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


class AgentPatch(BaseModel):
    is_active: bool


@router.patch("/{agent_id}")
async def patch_agent(agent_id: str, body: AgentPatch, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.task_id == agent_id, Agent.user_id == str(current_user.id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.is_active = body.is_active
    agent.updated_at = datetime.utcnow()
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    try:
        from app.services.agents.scheduler import reschedule_agent
        reschedule_agent(agent.task_id, agent.cron_expression, agent.is_active)
    except Exception as e:
        logger.warning("Scheduler sync failed for agent %s: %s", agent_id, e)
    return agent


@router.post("/{agent_id}/trigger")
@limiter.limit("5/minute")
async def trigger_agent(request: Request, agent_id: str, current_user=Depends(get_current_user), db=Depends(get_db)):
    result = await db.execute(select(Agent).where(Agent.task_id == agent_id, Agent.user_id == str(current_user.id)))
    agent = result.scalar_one_or_none()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    run_id = str(uuid.uuid4())
    agent.last_run_status = "running"
    agent.updated_at = datetime.utcnow()
    db.add(agent)
    await db.commit()

    task = asyncio.create_task(_run_agent(agent_id, run_id, str(current_user.id)))
    task.add_done_callback(_agent_task_done)
    return {"run_id": run_id}


def _agent_task_done(task: asyncio.Task) -> None:
    if not task.cancelled() and task.exception():
        logger.error("Agent background task failed: %s", task.exception())


async def _run_agent(task_id: str, run_id: str, user_id: str) -> None:
    await _broadcast_agent({"type": "agent_started", "task_id": task_id, "run_id": run_id, "user_id": user_id})
    now = datetime.utcnow()
    run_status = "success"
    try:
        # Placeholder — real implementation calls the agent service
        await asyncio.sleep(2)
    except Exception as e:
        logger.error("Agent %s run %s failed: %s", task_id, run_id, e)
        run_status = "error"

    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(select(Agent).where(Agent.task_id == task_id, Agent.user_id == user_id))
            agent = result.scalar_one_or_none()
            if agent:
                agent.last_run_at = now
                agent.last_run_status = run_status
                if run_status == "success":
                    agent.run_count += 1
                    agent.last_output_text = f"Agent completed at {now.strftime('%Y-%m-%d %H:%M UTC')}. Run #{agent.run_count}."
                else:
                    agent.last_output_text = f"Agent failed at {now.strftime('%Y-%m-%d %H:%M UTC')}."
                agent.updated_at = datetime.utcnow()
                session.add(agent)
                await session.commit()
        except Exception as e:
            logger.error("Failed to commit agent run status: %s", e)
    await _broadcast_agent({"type": "agent_complete", "task_id": task_id, "run_id": run_id, "status": run_status})


async def _broadcast_agent(event: dict) -> None:
    dead = set()
    for cb in list(_agent_subscribers):
        try:
            await cb(event)
        except Exception:
            dead.add(cb)
    _agent_subscribers.difference_update(dead)


async def agents_ws_handler(websocket: WebSocket) -> None:
    await websocket.accept()

    async def send_event(event: dict) -> None:
        await websocket.send_text(json.dumps(event))

    _agent_subscribers.add(send_event)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text(json.dumps({"type": "ping"}))
    except WebSocketDisconnect:
        pass
    finally:
        _agent_subscribers.discard(send_event)
