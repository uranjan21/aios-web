from functools import lru_cache

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
    vault_watch_interval_seconds: int = 5

    # AI
    llm_provider: str = "openai"  # "openai" | "anthropic"
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-5"
    openai_chat_model: str = "gpt-4o"
    openai_api_key: str = ""
    claude_daily_token_limit: int = 200000
    claude_session_token_limit: int = 50000

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
        # TOKEN_ENCRYPTION_KEY is required whenever Google OAuth integrations are configured (H4).
        # An empty key causes Fernet to raise InvalidToken on first OAuth token save.
        if (self.gcal_client_id or self.gfit_client_id) and not self.token_encryption_key:
            raise ValueError(
                "TOKEN_ENCRYPTION_KEY must be set when GCAL_CLIENT_ID or GFIT_CLIENT_ID is configured. "
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
