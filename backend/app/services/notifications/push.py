"""Web-push sender — delivers notifications to all stored browser subscriptions.

pywebpush is synchronous; calls run in a thread executor so the event loop
is never blocked. Dead subscriptions (404/410 from the push service) are pruned.
"""
import asyncio
import base64
import json
import logging

from pywebpush import webpush, WebPushException
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.push import PushSubscription

logger = logging.getLogger(__name__)


def _private_key_pem() -> str:
    """VAPID_PRIVATE_KEY is stored as base64-encoded PEM in env."""
    raw = get_settings().vapid_private_key
    if raw.startswith("-----BEGIN"):
        return raw
    return base64.b64decode(raw).decode()


def _send_one(sub_info: dict, payload: str) -> None:
    settings = get_settings()
    webpush(
        subscription_info=sub_info,
        data=payload,
        vapid_private_key=_private_key_pem(),
        vapid_claims={"sub": settings.vapid_subject},
        timeout=10,
    )


async def send_push_to_all(title: str, body: str, url: str = "/") -> int:
    """Send a push to every stored subscription. Returns delivered count."""
    settings = get_settings()
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.debug("Push skipped — VAPID keys not configured")
        return 0

    async with AsyncSessionLocal() as session:
        subs = (await session.execute(select(PushSubscription))).scalars().all()
        if not subs:
            return 0

        payload = json.dumps({"title": title, "body": body, "url": url})
        loop = asyncio.get_running_loop()
        delivered = 0

        for sub in subs:
            sub_info = {"endpoint": sub.endpoint, "keys": {"p256dh": sub.p256dh, "auth": sub.auth}}
            try:
                await loop.run_in_executor(None, _send_one, sub_info, payload)
                delivered += 1
            except WebPushException as e:
                status = getattr(e.response, "status_code", None)
                if status in (404, 410):
                    await session.delete(sub)
                    logger.info("Pruned dead push subscription %s", sub.id)
                else:
                    logger.warning("Push delivery failed (%s): %s", status, e)
            except Exception as e:
                logger.warning("Push delivery error: %s", e)

        await session.commit()
        return delivered
