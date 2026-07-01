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


def _job_id(task_id: str, user_id) -> str:
    """Scheduler job id — unique per (user, task) so users don't overwrite each other."""
    return f"{task_id}:{user_id}"


async def _run_global_job(module_name: str, func_name: str) -> None:
    from app.models.user import User
    from sqlmodel import select
    from app.db.session import AsyncSessionLocal
    import importlib
    
    try:
        mod = importlib.import_module(module_name)
        func = getattr(mod, func_name)
    except Exception as e:
        logger.error("Could not load global job %s.%s: %s", module_name, func_name, e)
        return

    try:
        async with AsyncSessionLocal() as session:
            users = (await session.execute(select(User))).scalars().all()
        for user in users:
            try:
                await func(user.id)
            except Exception as e:
                logger.error("Job %s failed for user %s: %s", func_name, user.id, e)
    except Exception as e:
        logger.error("Global job %s failed to get users: %s", func_name, e)


async def _run_billing_usage_report() -> None:
    """APScheduler entry — batch metered AI usage to Stripe."""
    from app.services.billing.usage import run_usage_report_job
    await run_usage_report_job()


async def _dispatch(task_id: str, user_id: uuid.UUID) -> None:
    """Called by APScheduler — fires the agent run pipeline."""
    from app.api.agents import _run_agent
    run_id = str(uuid.uuid4())
    try:
        await _run_agent(task_id, run_id, user_id)
    except Exception as e:
        logger.error("Scheduled agent %s failed: %s", task_id, e)


async def start_scheduler() -> None:
    """Load all active agents from DB and register cron jobs, then start."""
    from sqlmodel import select
    from app.db.session import AsyncSessionLocal
    from app.models.agent import Agent

    scheduler = get_scheduler()

    def _safe_add_job(job_id: str, **kwargs) -> None:
        """Register one fixed cron job without letting a single bad registration block the rest."""
        try:
            scheduler.add_job(id=job_id, **kwargs)
        except Exception as e:
            logger.error("Could not schedule fixed job %s: %s", job_id, e)

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
                    args=[agent.task_id, agent.user_id],
                    id=_job_id(agent.task_id, agent.user_id),
                    replace_existing=True,
                    misfire_grace_time=300,
                )
                registered += 1
            except Exception as e:
                logger.warning("Could not schedule agent %s (%s): %s", agent.task_id, agent.cron_expression, e)

        _safe_add_job(
            "finance_recurring_post",
            func=_run_global_job,
            trigger=CronTrigger(hour=1, minute=0, timezone="UTC"),
            args=["app.services.finance.recurring", "post_due_recurring"],
            replace_existing=True,
            misfire_grace_time=3600,
        )
        # 03:30 UTC = 9:00 IST — morning reminder for tomorrow's bills/EMIs
        _safe_add_job(
            "finance_due_tomorrow",
            func=_run_global_job,
            trigger=CronTrigger(hour=3, minute=30, timezone="UTC"),
            args=["app.services.finance.recurring", "notify_due_tomorrow"],
            replace_existing=True,
            misfire_grace_time=3600,
        )

        # 04:00 UTC = 9:30 IST — daily anomaly sweep (spending spikes, broken streaks)
        _safe_add_job(
            "insights_anomalies",
            func=_run_global_job,
            trigger=CronTrigger(hour=4, minute=0, timezone="UTC"),
            args=["app.services.insights.anomalies", "detect_anomalies"],
            replace_existing=True,
            misfire_grace_time=3600,
        )

        # Sunday 13:30 UTC = 19:00 IST — weekly digest
        _safe_add_job(
            "insights_weekly_digest",
            func=_run_global_job,
            trigger=CronTrigger(day_of_week="sun", hour=13, minute=30, timezone="UTC"),
            args=["app.services.insights.digest", "generate_weekly_digest"],
            replace_existing=True,
            misfire_grace_time=7200,
        )

        _safe_add_job(
            "google_sync",
            func=_run_global_job,
            trigger=CronTrigger(minute="*/30", timezone="UTC"),
            args=["app.services.integrations._sync_job", "run_google_sync"],
            replace_existing=True,
            misfire_grace_time=1800,
        )

        # Hourly at :15 — batch metered AI usage to Stripe (Phase 2).
        _safe_add_job(
            "billing_usage_report",
            func=_run_billing_usage_report,
            trigger=CronTrigger(minute=15, timezone="UTC"),
            replace_existing=True,
            misfire_grace_time=1800,
        )

        scheduler.start()
        logger.info("APScheduler started — %d/%d agents registered", registered, len(agents))

        # Catch-up pass at boot for due days missed while the server was down
        asyncio.get_running_loop().create_task(_run_global_job("app.services.finance.recurring", "post_due_recurring"))
    except Exception as e:
        logger.error("APScheduler startup failed (non-fatal): %s", e)


def reschedule_agent(task_id: str, cron_expression: str, is_active: bool, user_id: uuid.UUID = None) -> None:
    """Call after PATCH /agents/:id to keep scheduler in sync."""
    scheduler = get_scheduler()
    if not scheduler.running:
        return
    job_id = _job_id(task_id, user_id)
    if is_active:
        try:
            scheduler.add_job(
                _dispatch,
                trigger=CronTrigger.from_crontab(cron_expression, timezone="UTC"),
                args=[task_id, user_id],
                id=job_id,
                replace_existing=True,
                misfire_grace_time=300,
            )
        except Exception as e:
            logger.warning("reschedule_agent %s failed: %s", task_id, e)
    else:
        try:
            scheduler.remove_job(job_id)
        except Exception:
            pass  # job may not exist yet


def stop_scheduler() -> None:
    scheduler = get_scheduler()
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped")
