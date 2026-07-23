from functools import lru_cache
from typing import Literal
import secrets

from pydantic import model_validator, Field, ConfigDict
from pydantic_settings import BaseSettings

_INSECURE_DEFAULTS = {"change-me-in-production", "changeme", "secret", "demo1234", ""}


class Settings(BaseSettings):
    # App
    app_secret_key: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    app_email: str = "demo@aios.dev"
    app_password: str = "demo1234"
    google_login_email: str = ""
    allowed_origin: str = "http://localhost:5173"
    environment: str = "development"  # "production" | "development"

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

    # AI
    llm_provider: Literal["openai", "anthropic"] = "openai"
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-5"
    openai_chat_model: str = "gpt-4o"
    openai_api_key: str = ""
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

    # Billing (Stripe) — billing is OFF until a secret key + Pro price id are set.
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_pro: str = ""
    stripe_price_household: str = ""
    # Modular pricing (Phase 1): JSON map of module/bundle key → Stripe price id,
    # e.g. {"finance":"price_…","everything":"price_…","ai_usage":"price_…"}.
    stripe_module_prices: dict[str, str] = {}
    # Metered AI (Phase 2): free AI actions per calendar month. Past this, Chat/
    # Agents owners are billed for overage; everyone else is hard-capped.
    ai_free_monthly_credits: int = 200

    @property
    def billing_enabled(self) -> bool:
        """True only when Stripe is configured. Entitlement checks no-op when False."""
        return bool(self.stripe_secret_key and (self.stripe_price_pro or self.stripe_module_prices))

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.app_secret_key in _INSECURE_DEFAULTS or len(self.app_secret_key) < 32:
                raise ValueError(
                    "APP_SECRET_KEY must be at least 32 chars and not a default value in production"
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
            if self.stripe_secret_key and not self.stripe_secret_key.startswith("sk_live_"):
                raise ValueError(
                    "STRIPE_SECRET_KEY must use a live key (sk_live_…) in production, not a test key"
                )
            if "localhost" in self.allowed_origin:
                raise ValueError(
                    "ALLOWED_ORIGIN must not contain 'localhost' in production — set it to your deployed domain"
                )
        # TOKEN_ENCRYPTION_KEY is required whenever Google OAuth integrations are configured (H4).
        # An empty key causes Fernet to raise InvalidToken on first OAuth token save.
        if (self.gcal_client_id or self.gfit_client_id or self.gmail_client_id) and not self.token_encryption_key:
            raise ValueError(
                "TOKEN_ENCRYPTION_KEY must be set when GCAL_CLIENT_ID, GFIT_CLIENT_ID or GMAIL_CLIENT_ID is configured. "
                "Generate one with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        return self

    model_config = ConfigDict(
        env_file=(".env", "../.env"),  # works whether run from backend/ or aios-web/
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
