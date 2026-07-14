"""Email delivery via Resend API.

When RESEND_API_KEY is unset (dev / test), the email body is logged to stdout
so developers can click the verification link without a real mail server.
"""
import logging

import httpx

logger = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


async def send_verification_email(to: str, token: str, origin: str, from_addr: str, api_key: str) -> None:
    verify_url = f"{origin}/verify-email?token={token}"
    html = (
        "<p>Welcome to AIOS! Please verify your email address by clicking the link below:</p>"
        f'<p><a href="{verify_url}">Verify my email</a></p>'
        f"<p>Or copy this URL: {verify_url}</p>"
        "<p>This link expires in 24 hours.</p>"
    )

    if not api_key:
        logger.info("EMAIL (no RESEND_API_KEY) → verify URL for %s: %s", to, verify_url)
        return

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            RESEND_SEND_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": from_addr, "to": [to], "subject": "Verify your AIOS email", "html": html},
        )
        if resp.status_code >= 400:
            logger.error("Resend API error %s: %s", resp.status_code, resp.text)
