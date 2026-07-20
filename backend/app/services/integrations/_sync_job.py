import logging
import uuid

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.integration import IntegrationCredential

logger = logging.getLogger(__name__)


async def run_google_sync(user_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(IntegrationCredential).where(IntegrationCredential.user_id == user_id))
        rows = result.scalars().all()
        creds = {c.provider: c for c in rows}

        gcal = creds.get("gcal")
        if gcal and gcal.status == "connected":
            try:
                from app.services.integrations.google_calendar import sync_events
                count = await sync_events(user_id, db)
                logger.info("Background gcal sync: %d events", count)
            except Exception:
                logger.exception("Background gcal sync failed")

        gfit = creds.get("gfit")
        if gfit and gfit.status == "connected":
            try:
                from app.services.integrations.google_fit import sync_fitness
                count = await sync_fitness(user_id, db)
                logger.info("Background gfit sync: %d days", count)
            except Exception:
                logger.exception("Background gfit sync failed")

        # Gmail may have several rows (one per linked account) — sync if ANY is
        # connected; sync_messages iterates the accounts itself.
        if any(c.provider == "gmail" and c.status == "connected" for c in rows):
            try:
                from app.services.integrations.gmail import sync_messages
                count = await sync_messages(user_id, db)
                logger.info("Background gmail sync: %d messages", count)
            except Exception:
                logger.exception("Background gmail sync failed")
