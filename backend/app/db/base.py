from sqlmodel import SQLModel

# Import all models here so Alembic can detect them
from app.models.user import User  # noqa
from app.models.vault import VaultFile, VaultConflict, VaultChunk  # noqa
from app.models.finance import FinanceSnapshot, FinanceExpense, BudgetLimit, Account, Category, AccountType  # noqa
from app.models.health import HealthLog  # noqa
from app.models.career import CareerEvent, SkillInventory, JobOpportunity  # noqa
from app.models.business import BusinessEvent  # noqa
from app.models.content import ContentItem  # noqa
from app.models.chat import ChatSession, ChatMessage, DailyTokenUsage  # noqa
from app.models.integration import IntegrationCredential  # noqa
from app.models.google_sync import CalendarEvent, GoogleFitMetric  # noqa
from app.models.agent import Agent  # noqa
from app.models.oauth_state import OAuthState  # noqa
