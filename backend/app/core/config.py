from functools import lru_cache
from typing import Literal

from pydantic import model_validator, ConfigDict
from pydantic_settings import BaseSettings

# The default APP_SECRET_KEY. It MUST be a fixed literal, not a generated one:
# a `default_factory=secrets.token_urlsafe(32)` produces a fresh 43-char key per
# *process*, which passes both production guards below while giving every
# gunicorn worker a different JWT signing key (the Dockerfile runs gunicorn
# without --preload). Half of all authenticated requests then 401 at random,
# with nothing in the logs. Fixed literal + membership in _INSECURE_DEFAULTS
# means an unset var is a hard startup failure in production instead.
_DEV_SECRET = "dev-only-insecure-secret-do-not-use-in-production"

_INSECURE_DEFAULTS = {"change-me-in-production", "changeme", "secret", "demo1234", "", _DEV_SECRET}


class Settings(BaseSettings):
    # App
    app_secret_key: str = _DEV_SECRET
    app_email: str = "demo@aios.dev"
    app_password: str = "demo1234"
    google_login_email: str = ""
    allowed_origin: str = "http://localhost:5173"
    environment: str = "development"  # "production" | "development"
    # Explicit acknowledgement that a production deployment is served over plain
    # http. A non-https ALLOWED_ORIGIN means the auth cookie cannot carry the
    # Secure flag, so every JWT crosses the network in cleartext. Production
    # refuses to start without this, so cleartext auth is always a deliberate
    # choice rather than something you discover after launch.
    allow_insecure_http: bool = False

    # Database
    database_url: str = "postgresql+asyncpg://localhost:5432/aios_web"

    # Redis — REQUIRED for rate limiting across >1 worker (autoscaled/multi-worker
    # deploys). When unset the limiter uses per-process memory (fine for a single
    # worker / dev only). Format: redis://host:6379/0
    redis_url: str = ""

    # Vault — single-tenant / self-host feature. Disable in hosted multi-tenant SaaS:
    # the vault is a single shared filesystem and is NOT isolated per user.
    vault_sync_enabled: bool = True
    # Explicit acknowledgement that a single-tenant vault is intended in a
    # production deployment (self-host). Without it, production refuses to start
    # vault sync — guards against a forgotten env var leaking data on hosted SaaS.
    vault_single_tenant_ack: bool = False
    vault_path: str = "/tmp/vault"
    # Pin the vault to a specific user by email instead of relying on creation order.
    vault_owner_email: str = ""
    vault_watch_interval_seconds: int = 5

    # AI — bring-your-own-key: there is deliberately NO instance-level API key.
    # Every LLM call reads the authenticated user's own encrypted key (see
    # `app/services/ai/keys.py`); a server key would silently pay for users who
    # never configured one, which is exactly the uncapped-spend hole BYOK closes.
    llm_provider: Literal["openai", "anthropic"] = "openai"
    claude_model: str = "claude-sonnet-4-5"
    openai_chat_model: str = "gpt-4o"
    # Scheduled agent runs (briefs, digests, email extraction) are structured
    # summarize/parse tasks — they default to the small tier (~16x cheaper than
    # the chat default). Per-user and per-agent model overrides still win.
    agent_openai_model: str = "gpt-4o-mini"
    agent_claude_model: str = "claude-haiku-4-5"
    claude_daily_token_limit: int = 200000
    claude_session_token_limit: int = 50000
    # Models clients may request (chat WS payload / agent overrides). Anything
    # else falls back to the defaults above — never trust a raw model string on
    # the operator's key.
    allowed_openai_models: list[str] = ["gpt-4o", "gpt-4o-mini"]
    allowed_claude_models: list[str] = ["claude-sonnet-4-5", "claude-haiku-4-5"]

    # Email (Resend API — https://resend.com). When unset, verification emails are
    # logged to stdout instead of sent (useful for local dev / test).
    resend_api_key: str = ""
    email_from: str = "AIOS <noreply@aios.dev>"

    # Encryption
    token_encryption_key: str = ""

    # Integrations
    notion_client_id: str = ""
    notion_client_secret: str = ""
    gcal_client_id: str = ""
    gcal_client_secret: str = ""
    gfit_client_id: str = ""
    gfit_client_secret: str = ""
    # Gmail falls back to the gcal OAuth client when unset (same Google Cloud app).
    gmail_client_id: str = ""
    gmail_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    # Web push (VAPID)
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_subject: str = "mailto:utsavranjan.sk@gmail.com"

    # Observability (Sentry). Unset → no error reporting (dev/test stay silent).
    sentry_dsn: str = ""
    # Fraction of transactions traced for performance. Keep low in prod.
    sentry_traces_sample_rate: float = 0.0

    # Rate limiting
    rate_limit_chat_per_min: int = 20
    rate_limit_global_per_min: int = 120

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.app_secret_key in _INSECURE_DEFAULTS or len(self.app_secret_key) < 32:
                raise ValueError(
                    "APP_SECRET_KEY must be set to a random value of at least 32 chars in "
                    "production — it is unset or still a default. Every worker signs JWTs "
                    "with this key, so it must be identical across the fleet and across "
                    "restarts.\n"
                    '  Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
                )
            if self.app_password in _INSECURE_DEFAULTS:
                raise ValueError("APP_PASSWORD must not be a default value in production")
            if not self.redis_url:
                raise ValueError(
                    "REDIS_URL must be set in production for distributed rate limiting. "
                    "Start a Redis instance and set REDIS_URL=redis://host:6379/0"
                )
            if not self.resend_api_key:
                raise ValueError(
                    "RESEND_API_KEY must be set in production so verification emails can be delivered"
                )
            if "localhost" in self.allowed_origin:
                raise ValueError(
                    "ALLOWED_ORIGIN must not contain 'localhost' in production — set it to your deployed domain"
                )
            if not self.allowed_origin.startswith("https://") and not self.allow_insecure_http:
                raise ValueError(
                    f"ALLOWED_ORIGIN is {self.allowed_origin!r} — not https. The auth cookie "
                    "cannot carry the Secure flag over plain http, so every JWT (and all "
                    "financial and health data) crosses the network in cleartext.\n"
                    "  Fix: point a hostname at this server and set SITE_ADDRESS=<host> plus "
                    "ALLOWED_ORIGIN=https://<host>. Caddy provisions the certificate itself, "
                    "and a Hostinger VPS already has a free srvNNNNNN.hstgr.cloud hostname "
                    "that Let's Encrypt accepts — see docs/DEPLOYMENT.md §4.\n"
                    "  To ship on cleartext anyway, set ALLOW_INSECURE_HTTP=true."
                )
            if not self.token_encryption_key:
                raise ValueError(
                    "TOKEN_ENCRYPTION_KEY must be set in production. It encrypts every "
                    "user's own OpenAI/Anthropic API key at rest (bring-your-own-key), not "
                    "just Google OAuth tokens — without it those credentials cannot be "
                    "stored or read at all.\n"
                    "  Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
                )
        # Outside production the key is only required when Google OAuth is configured (H4):
        # an empty key causes Fernet to raise InvalidToken on the first OAuth token save.
        if (self.gcal_client_id or self.gfit_client_id or self.gmail_client_id) and not self.token_encryption_key:
            raise ValueError(
                "TOKEN_ENCRYPTION_KEY must be set when GCAL_CLIENT_ID, GFIT_CLIENT_ID or GMAIL_CLIENT_ID is configured. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return self

    model_config = ConfigDict(
        env_file=(".env", "../.env"),  # works whether run from backend/ or the repo root
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
