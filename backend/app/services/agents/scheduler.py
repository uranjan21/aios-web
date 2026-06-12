"""APScheduler-based cron runner for AIOS agents."""
import asyncio
import logging
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler(timezone="UTC")
    return _scheduler


async def _dispatch(task_id: str) -> None:
    """Called by APScheduler — fires the agent run pipeline."""
    from app.api.agents import _run_agent
    run_id = str(uuid.uuid4())
    try:
        await _run_agent(task_id, run_id)
    except Exception as e:
        logger.error("Scheduled agent %s failed: %s", task_id, e)


async def start_scheduler() -> None:
    """Load all active agents from DB and register cron jobs, then start."""
    from sqlmodel import select
    from app.db.session import AsyncSessionLocal
    from app.models.agent import Agent

    scheduler = get_scheduler()

    try:
        async with AsyncSessionLocal() as session:
            result = await session.execute(select(Agent).where(Agent.is_active == True))
            agents = result.scalars().all()

        registered = 0
        for agent in agents:
            try:
                scheduler.add_job(
                    _dispatch,
                    trigger=CronTrigger.from_crontab(agent.cron_expression, timezone="UTC"),
                    args=[agent.task_id],
                    id=agent.task_id,
                    replace_existing=True,
                    misfire_grace_time=300,
                )
                registered += 1
            except Exception as e:
                logger.warning("Could not schedule agent %s (%s): %s", agent.task_id, agent.cron_expression, e)

        from app.services.finance.recurring import post_due_recurring, notify_due_tomorrow
        scheduler.add_job(
            post_due_recurring,
            trigger=CronTrigger(hour=1, minute=0, timezone="UTC"),
            id="finance_recurring_post",
            replace_existing=True,
            misfire_grace_time=3600,
        )
        # 03:30 UTC = 9:00 IST — morning reminder for tomorrow's bills/EMIs
        scheduler.add_job(
            notify_due_tomorrow,
            trigger=CronTrigger(hour=3, minute=30, timezone="UTC"),
            id="finance_due_tomorrow",
            replace_existing=True,
            misfire_grace_time=3600,
        )

        from app.services.insights.anomalies import detect_anomalies
        # 04:00 UTC = 9:30 IST — daily anomaly sweep (spending spikes, broken streaks)
        scheduler.add_job(
            detect_anomalies,
            trigger=CronTrigger(hour=4, minute=0, timezone="UTC"),
            id="insights_anomalies",
            replace_existing=True,
            misfire_grace_time=3600,
        )

        from app.services.insights.digest import generate_weekly_digest
        # Sunday 13:30 UTC = 19:00 IST — weekly digest
        scheduler.add_job(
            generate_weekly_digest,
            trigger=CronTrigger(day_of_week="sun", hour=13, minute=30, timezone="UTC"),
            id="insights_weekly_digest",
            replace_existing=True,
            misfire_grace_time=7200,
        )

        scheduler.start()
        logger.info("APScheduler started — %d/%d agents registered", registered, len(agents))

        # Catch-up pass at boot for due days missed while the server was down
        asyncio.get_running_loop().create_task(post_due_recurring())
    except Exception as e:
        logger.error("APScheduler startup failed (non-fatal): %s", e)


def reschedule_agent(task_id: str, cron_expression: str, is_active: bool) -> None:
    """Call after PATCH /agents/:id to keep scheduler in sync."""
    scheduler = get_scheduler()
    if not scheduler.running:
        return
    if is_active:
        try:
            scheduler.add_job(
                _dispatch,
                trigger=CronTrigger.from_crontab(cron_expression, timezone="UTC"),
                args=[task_id],
                id=task_id,
                replace_existing=True,
                misfire_grace_time=300,
            )
        except Exception as e:
            logger.warning("reschedule_agent %s failed: %s", task_id, e)
    else:
        try:
            scheduler.remove_job(task_id)
        except Exception:
            pass  # job may not exist yet


def stop_scheduler() -> None:
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
