"""Email delivery via Resend API.

When RESEND_API_KEY is unset (dev / test), the email body is logged to stdout
so developers can click the verification link without a real mail server.
"""
import logging

import httpx

logger = logging.getLogger(__name__)

RESEND_SEND_URL = "https://api.resend.com/emails"


async def _send(to: str, subject: str, html: str, from_addr: str, api_key: str, log_hint: str) -> None:
    if not api_key:
        logger.info("EMAIL (no RESEND_API_KEY) → %s for %s: %s", subject, to, log_hint)
        return

    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            RESEND_SEND_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"from": from_addr, "to": [to], "subject": subject, "html": html},
        )
        if resp.status_code >= 400:
            logger.error("Resend API error %s: %s", resp.status_code, resp.text)


async def send_verification_email(to: str, token: str, origin: str, from_addr: str, api_key: str) -> None:
    verify_url = f"{origin}/verify-email?token={token}"
    html = (
        "<p>Welcome to AIOS! Please verify your email address by clicking the link below:</p>"
        f'<p><a href="{verify_url}">Verify my email</a></p>'
        f"<p>Or copy this URL: {verify_url}</p>"
        "<p>This link expires in 24 hours.</p>"
    )
    await _send(to, "Verify your AIOS email", html, from_addr, api_key, verify_url)


async def send_password_reset_email(to: str, token: str, origin: str, from_addr: str, api_key: str) -> None:
    reset_url = f"{origin}/reset-password?token={token}"
    html = (
        "<p>Someone requested a password reset for your AIOS account.</p>"
        f'<p><a href="{reset_url}">Choose a new password</a></p>'
        f"<p>Or copy this URL: {reset_url}</p>"
        "<p>This link expires in 1 hour and can only be used once. "
        "If you didn't request this, you can safely ignore this email — "
        "your password has not been changed.</p>"
    )
    await _send(to, "Reset your AIOS password", html, from_addr, api_key, reset_url)


async def send_existing_account_email(to: str, origin: str, from_addr: str, api_key: str) -> None:
    """Sent when someone tries to sign up with an address that already has an account.

    This is what lets /signup answer identically for new and existing emails —
    the account holder gets told, an attacker probing the endpoint learns nothing.
    """
    login_url = f"{origin}/login"
    forgot_url = f"{origin}/forgot-password"
    html = (
        "<p>Someone just tried to create an AIOS account with this email address, "
        "but you already have one.</p>"
        f'<p><a href="{login_url}">Log in</a> — or '
        f'<a href="{forgot_url}">reset your password</a> if you\'ve forgotten it.</p>'
        "<p>If this wasn't you, no action is needed.</p>"
    )
    await _send(to, "You already have an AIOS account", html, from_addr, api_key, login_url)
