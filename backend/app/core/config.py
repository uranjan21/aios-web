from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_secret_key: str = "change-me-in-production"
    app_password: str = "changeme"
    allowed_origin: str = "http://localhost:5173"

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

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
