"""APScheduler-based cron runner for AIOS agents."""
import asyncio
import logging
import uuid

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import text

logger = logging.getLogger(__name__)

_scheduler: AsyncIOScheduler | None = None
# Strong refs to fire-and-forget tasks so they aren't garbage-collected mid-run.
_background_tasks: set = set()

# Advisory lock so exactly ONE worker runs cron jobs in a multi-worker deploy —
# otherwise every worker fires every agent (duplicate LLM spend + pushes).
_LEADER_LOCK_KEY = 0x41494F53  # "AIOS"
_leader_conn = None  # held open for the process lifetime; lock is session-scoped


async def acquire_scheduler_leadership() -> bool:
    """Try to become the scheduler leader via a Postgres advisory lock.

    The lock releases automatically when this worker's connection dies, so a
    crashed leader is replaced on the next worker restart.
    """
    global _leader_conn
    if _leader_conn is not None:
        return True
    from app.db.session import engine

    conn = await engine.connect()
    try:
        got = (
            await conn.execute(text("SELECT pg_try_advisory_lock(:key)"), {"key": _LEADER_LOCK_KEY})
        ).scalar()
    except Exception:
        await conn.close()
        raise
    if got:
        _leader_conn = conn
        return True
    await conn.close()
    return False


async def release_scheduler_leadership() -> None:
    global _leader_conn
    if _leader_conn is not None:
        try:
            await _leader_conn.close()
        except Exception:
            pass
        _leader_conn = None


def get_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is None:
        # coalesce: a job that fell behind runs ONCE on catch-up instead of
        # firing every missed interval back-to-back; the explicit grace time
        # means a skipped fire is logged rather than silently dropped.
        _scheduler = AsyncIOScheduler(
            timezone="UTC",
            job_defaults={"coalesce": True, "misfire_grace_time": 300},
        )
    return _scheduler


def _job_id(task_id: str, user_id) -> str:
    """Scheduler job id — unique per (user, task) so users don't overwrite each other."""
    return f"{task_id}:{user_id}"


def _safe_tz(tz: str | None) -> str:
    """Validate an IANA tz string, falling back to UTC on anything unknown."""
    if not tz:
        return "UTC"
    try:
        from zoneinfo import ZoneInfo
        ZoneInfo(tz)
        return tz
    except Exception:
        logger.warning("Unknown agent timezone %r — using UTC", tz)
        return "UTC"


# Users are walked in keyset-paginated batches rather than loaded whole, and
# each batch runs with bounded concurrency — these jobs do DB and network work,
# so a serial sweep at 10k users outruns the interval and APScheduler starts
# dropping fires.
_GLOBAL_JOB_BATCH = 200
_GLOBAL_JOB_CONCURRENCY = 8


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

    sem = asyncio.Semaphore(_GLOBAL_JOB_CONCURRENCY)

    async def _one(user_id) -> None:
        async with sem:
            try:
                await func(user_id)
            except Exception as e:
                # One user's failure must never abort the sweep.
                logger.error("Job %s failed for user %s: %s", func_name, user_id, e)

    try:
        after = None
        while True:
            async with AsyncSessionLocal() as session:
                stmt = select(User.id).order_by(User.id).limit(_GLOBAL_JOB_BATCH)
                if after is not None:
                    stmt = stmt.where(User.id > after)
                user_ids = (await session.execute(stmt)).scalars().all()
            if not user_ids:
                break
            await asyncio.gather(*(_one(uid) for uid in user_ids))
            after = user_ids[-1]
    except Exception as e:
        logger.error("Global job %s failed to get users: %s", func_name, e)


async def _run_briefing_job() -> None:
    from app.services.insights.briefing import run_briefing_job
    await run_briefing_job()

async def _run_synergy_job() -> None:
    from app.services.insights.synergy import run_synergy_job
    await run_synergy_job()

async def _run_forecast_job() -> None:
    from app.services.ai.forecasting import run_forecast_job
    await run_forecast_job()

async def _run_automation_tick() -> None:
    from app.services.automations.engine import run_automation_tick
    await run_automation_tick()

async def _run_knowledge_pull() -> None:
    from app.services.knowledge.puller import run_knowledge_pull
    await run_knowledge_pull()


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
                    trigger=CronTrigger.from_crontab(agent.cron_expression, timezone=_safe_tz(agent.tz)),
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

        # Hourly at :45 — auto-commit pending finance transactions that have passed their 24h review window
        _safe_add_job(
            "finance_auto_commit",
            func=_run_global_job,
            trigger=CronTrigger(minute=45, timezone="UTC"),
            args=["app.services.finance.pending", "run_auto_commit_pending_transactions"],
            replace_existing=True,
            misfire_grace_time=1800,
        )

        # NOTE: the regex email-ingestion runner (services.finance.email_ingest) is NOT scheduled
        # here — main's Transaction Tracker agent already sweeps Gmail 6-hourly. The regex path is
        # available on demand via POST /api/areas/finance/ingest/run to avoid duplicate pending rows.

        # 1st of month 05:00 UTC — write each owner's monthly finance summary into the vault.
        _safe_add_job(
            "finance_vault_summary",
            func=_run_global_job,
            trigger=CronTrigger(day=1, hour=5, minute=0, timezone="UTC"),
            args=["app.services.finance.vault_summary", "run_finance_vault_summary"],
            replace_existing=True,
            misfire_grace_time=7200,
        )

        # 1st of month 05:30 UTC — CSV backup of all finance tables per user.
        _safe_add_job(
            "finance_csv_backup",
            func=_run_global_job,
            trigger=CronTrigger(day=1, hour=5, minute=30, timezone="UTC"),
            args=["app.services.finance.backup", "run_finance_backup"],
            replace_existing=True,
            misfire_grace_time=7200,
        )

        # Hourly at :50 — auto-commit pending agent actions that have passed their 24h review window
        _safe_add_job(
            "agent_action_auto_commit",
            func=_run_global_job,
            trigger=CronTrigger(minute=50, timezone="UTC"),
            args=["app.services.ai.action_runner", "run_auto_commit_pending_actions"],
            replace_existing=True,
            misfire_grace_time=1800,
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

        _safe_add_job(
            "insights_briefing",
            func=_run_briefing_job,
            trigger=CronTrigger(minute="*/15", timezone="UTC"),
            replace_existing=True,
            misfire_grace_time=300,
        )

        _safe_add_job(
            "insights_synergy",
            func=_run_synergy_job,
            trigger=CronTrigger(hour=3, minute=0, timezone="UTC"),
            replace_existing=True,
            misfire_grace_time=3600,
        )

        _safe_add_job(
            "forecasts_nightly",
            func=_run_forecast_job,
            trigger=CronTrigger(hour=2, minute=30, timezone="UTC"),
            replace_existing=True,
            misfire_grace_time=3600,
        )

        _safe_add_job(
            "automation_tick",
            func=_run_automation_tick,
            trigger=CronTrigger(minute=5, timezone="UTC"),  # hourly at :05
            replace_existing=True,
            misfire_grace_time=900,
        )

        # Every 10 min — pull knowledge sources whose sync interval has elapsed.
        _safe_add_job(
            "knowledge_pull",
            func=_run_knowledge_pull,
            trigger=CronTrigger(minute="*/10", timezone="UTC"),
            replace_existing=True,
            misfire_grace_time=600,
        )

        scheduler.start()
        logger.info("APScheduler started — %d/%d agents registered", registered, len(agents))

        # Catch-up pass at boot for due days missed while the server was down
        # Hold a reference — a bare create_task is GC-eligible mid-flight and
        # its exception is never retrieved.
        catch_up = asyncio.get_running_loop().create_task(
            _run_global_job("app.services.finance.recurring", "post_due_recurring")
        )
        _background_tasks.add(catch_up)
        catch_up.add_done_callback(lambda t: (
            _background_tasks.discard(t),
            not t.cancelled() and t.exception() and logger.error(
                "Boot catch-up job failed: %s", t.exception()),
        ))
    except Exception as e:
        logger.error("APScheduler startup failed (non-fatal): %s", e)


def reschedule_agent(task_id: str, cron_expression: str, is_active: bool, user_id: uuid.UUID = None, tz: str | None = None) -> None:
    """Call after PATCH /agents/:id to keep scheduler in sync."""
    scheduler = get_scheduler()
    if not scheduler.running:
        return
    job_id = _job_id(task_id, user_id)
    if is_active:
        try:
            scheduler.add_job(
                _dispatch,
                trigger=CronTrigger.from_crontab(cron_expression, timezone=_safe_tz(tz)),
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
