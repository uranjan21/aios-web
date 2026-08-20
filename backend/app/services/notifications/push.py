"""Web-push sender — delivers notifications to all stored browser subscriptions.

pywebpush is synchronous; calls run in a thread executor so the event loop
is never blocked. Dead subscriptions (404/410 from the push service) are pruned.
"""
import asyncio
import base64
import ipaddress
import json
import logging
import uuid
from urllib.parse import urlsplit

from pywebpush import webpush, WebPushException
from sqlmodel import select

from app.core.config import get_settings
from app.db.session import AsyncSessionLocal
from app.models.push import PushSubscription

logger = logging.getLogger(__name__)

# The server POSTs to whatever `endpoint` says, so an unvalidated string is an
# authenticated SSRF primitive: link-local metadata, internal services,
# arbitrary ports. Only the real push services can ever be a legitimate value.
# `api/push.py` validates on write; `_send_one` re-checks so rows stored before
# this existed can't be used either.
_PUSH_HOST_SUFFIXES = (".notify.windows.com",)
_PUSH_HOSTS = frozenset({
    "fcm.googleapis.com",
    "updates.push.services.mozilla.com",
    "web.push.apple.com",
})
MAX_ENDPOINT_LENGTH = 1024


def validate_push_endpoint(value: str) -> str:
    """Return the endpoint unchanged, or raise ValueError if it isn't a push service."""
    value = (value or "").strip()
    if not value or len(value) > MAX_ENDPOINT_LENGTH:
        raise ValueError("endpoint is empty or too long")
    parts = urlsplit(value)
    if parts.scheme != "https":
        raise ValueError("endpoint must be https")
    host = (parts.hostname or "").lower()
    if not host:
        raise ValueError("endpoint has no host")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        # An IP literal can never be a push service and is the SSRF shape itself.
        raise ValueError("endpoint host must be a push-service domain")
    if host not in _PUSH_HOSTS and not host.endswith(_PUSH_HOST_SUFFIXES):
        raise ValueError("endpoint is not a known push service")
    return value


def _private_key_pem() -> str:
    """VAPID_PRIVATE_KEY is stored as base64-encoded PEM in env."""
    raw = get_settings().vapid_private_key
    if raw.startswith("-----BEGIN"):
        return raw
    return base64.b64decode(raw).decode()


def _send_one(sub_info: dict, payload: str) -> None:
    settings = get_settings()
    validate_push_endpoint(sub_info.get("endpoint", ""))
    webpush(
        subscription_info=sub_info,
        data=payload,
        vapid_private_key=_private_key_pem(),
        vapid_claims={"sub": settings.vapid_subject},
        timeout=10,
    )


async def send_push_to_all(user_id: uuid.UUID, title: str, body: str, url: str = "/") -> int:
    """Send a push to every stored subscription. Returns delivered count."""
    settings = get_settings()
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.debug("Push skipped — VAPID keys not configured")
        return 0

    async with AsyncSessionLocal() as session:
        subs = (await session.execute(select(PushSubscription).where(PushSubscription.user_id == user_id))).scalars().all()
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
