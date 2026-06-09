from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings

_INSECURE_DEFAULTS = {"change-me-in-production", "changeme", "secret", ""}


class Settings(BaseSettings):
    # App
    app_secret_key: str = "change-me-in-production"
    app_password: str = "changeme"
    allowed_origin: str = "http://localhost:5173"
    environment: str = "development"  # "production" | "development"

    # Database
    database_url: str = "postgresql+asyncpg://aios:aios_dev_password@localhost:5432/aios_web"

    # Vault
    vault_path: str = "/tmp/vault"
    vault_watch_interval_seconds: int = 5

    # AI
    anthropic_api_key: str = ""
    claude_model: str = "claude-sonnet-4-5"
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
    github_client_id: str = ""
    github_client_secret: str = ""

    # Rate limiting
    rate_limit_chat_per_min: int = 20
    rate_limit_global_per_min: int = 120

    @model_validator(mode="after")
    def validate_secrets(self) -> "Settings":
        if self.environment == "production":
            if self.app_secret_key in _INSECURE_DEFAULTS or len(self.app_secret_key) < 32:
                raise ValueError(
                    "APP_SECRET_KEY must be at least 32 chars and not a default value in production"
                )
            if self.app_password in _INSECURE_DEFAULTS:
                raise ValueError("APP_PASSWORD must not be a default value in production")
        return self

    class Config:
        env_file = (".env", "../.env")  # works whether run from backend/ or aios-web/
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
