"""Shared test fixtures."""
import os
import uuid

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlmodel import SQLModel
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(type_, compiler, **kw):
    return "JSON"


# Point at a test DB (in-memory SQLite for unit tests; set DATABASE_URL env for integration)
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-minimum-32-chars!!")
os.environ.setdefault("APP_EMAIL", "admin@example.com")
os.environ.setdefault("APP_PASSWORD", "testpass")
os.environ.setdefault("LLM_PROVIDER", "openai")
os.environ.setdefault("OPENAI_API_KEY", "sk-placeholder")
os.environ.setdefault("ANTHROPIC_API_KEY", "sk-placeholder")
os.environ.setdefault("ALLOWED_ORIGIN", "http://localhost:5173")
os.environ.setdefault("VAULT_PATH", "/tmp/vault-test")
os.environ.setdefault("TOKEN_ENCRYPTION_KEY", "dGVzdC1rZXktZm9yLWNpLW9ubHktZG8tbm90LXVzZQ==")


@pytest.fixture(scope="session", autouse=True)
def mock_openai_client_fixture():
    """Mock get_openai_client globally to avoid real API calls."""
    import sys
    import app.services.ai.openai_client

    class MockChoiceDelta:
        def __init__(self, content=None, tool_calls=None):
            self.content = content
            self.tool_calls = tool_calls

    class MockMessage:
        def __init__(self, content: str):
            self.content = content

    class MockChoice:
        def __init__(self, content: str = "", delta = None, finish_reason: str = None):
            self.message = MockMessage(content)
            self.delta = delta
            self.finish_reason = finish_reason

    class MockUsage:
        def __init__(self, prompt_tokens: int = 10, completion_tokens: int = 5):
            self.prompt_tokens = prompt_tokens
            self.completion_tokens = completion_tokens

    class MockChunk:
        def __init__(self, choices=None, usage=None):
            self.choices = choices or []
            self.usage = usage

    class MockResponse:
        def __init__(self, content: str):
            self.choices = [MockChoice(content=content)]
            self.usage = MockUsage()

    class MockCompletions:
        async def create(self, *args, **kwargs):
            stream = kwargs.get("stream", False)
            messages = kwargs.get("messages", [])
            user_text = "test"
            if messages and isinstance(messages, list):
                last_msg = messages[-1]
                if isinstance(last_msg, dict) and last_msg.get("role") == "user":
                    user_text = last_msg.get("content", "test")
            
            import json
            content = json.dumps({
                "domain": "capture",
                "fields": {"text": user_text},
                "summary": "Save as note"
            })
            if stream:
                async def stream_gen():
                    # yield first chunk with the text content
                    yield MockChunk(choices=[MockChoice(delta=MockChoiceDelta(content=content))])
                    # yield finish chunk
                    yield MockChunk(choices=[MockChoice(delta=MockChoiceDelta(content=None), finish_reason="stop")])
                    # yield usage chunk
                    yield MockChunk(choices=[], usage=MockUsage(prompt_tokens=15, completion_tokens=8))
                return stream_gen()
            else:
                return MockResponse(content=content)

    class MockChat:
        def __init__(self):
            self.completions = MockCompletions()

    class MockAsyncOpenAI:
        def __init__(self):
            self.chat = MockChat()

    mock_client = MockAsyncOpenAI()

    def mock_fn():
        return mock_client

    # Store original
    original_get = app.services.ai.openai_client.get_openai_client

    # Override in original module
    app.services.ai.openai_client.get_openai_client = mock_fn

    # Patch in any already imported modules
    for name, module in list(sys.modules.items()):
        if name.startswith("app."):
            if hasattr(module, "get_openai_client"):
                setattr(module, "get_openai_client", mock_fn)

    yield mock_client

    # Restore in original module
    app.services.ai.openai_client.get_openai_client = original_get


# A single shared in-memory SQLite connection (StaticPool) so schema created in
# one session is visible to every other session in the test run.
_test_engine = create_async_engine(
    "sqlite+aiosqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(bind=_test_engine, class_=AsyncSession, expire_on_commit=False)


from sqlalchemy import event

@event.listens_for(_test_engine.sync_engine, "connect")
def register_sqlite_functions(dbapi_connection, connection_record):
    try:
        def sqlite_date(val):
            if not val:
                return None
            return str(val).split(" ")[0].split("T")[0]
        dbapi_connection.create_function("date", 1, sqlite_date)
    except Exception:
        pass


def _isolation_tables():
    """Subset of tables that use SQLite-compatible column types (excludes pgvector vault tables)."""
    from app.models.user import User
    from app.models.chat import ChatSession, ChatMessage
    from app.models.captures import Capture
    from app.models.integration import IntegrationCredential
    from app.models.agent import Agent
    from app.models.push import PushSubscription
    from app.models.billing import Subscription, AIUsageRecord, FailedWebhook
    from app.models.action import AgentAction
    from app.models.forecast import Forecast
    from app.models.automations import AutomationRule
    from app.models.admin_audit import AdminAuditLog
    from app.models.workspace import Project, Sprint, Task, Milestone, PlanBlock
    from app.models.goal import MacroGoal, GoalProgress
    from app.models.content import ContentItem, ContentCampaign
    from app.models.health import WorkoutRoutine, RoutineExercise, RoutineDay, HealthLog, HealthGoal, Habit, HabitCheck, WorkoutSession, WorkoutSet, FoodItem
    from app.models.finance import FinanceExpense, FinanceIncome, FinanceTransfer, Account, Category, FinancePendingTransaction, FinanceSettings
    from app.models.google_sync import GmailMessage
    from app.models.career import CareerEvent, JobOpportunity, CareerJournalEntry
    from app.models.business import BusinessEvent
    from app.models.insights import BriefingPreference, Briefing, Insight
    from app.models.quote import SavedQuote
    from app.models.vault import VaultFile, VaultConflict
    from app.models.oauth_state import OAuthState
    return [m.__table__ for m in (
        OAuthState,
        User, ChatSession, ChatMessage, Capture, IntegrationCredential, Agent, PushSubscription, Subscription, AIUsageRecord,
        FailedWebhook, AgentAction, Forecast, AutomationRule, AdminAuditLog,
        Project, Sprint, Task, Milestone, PlanBlock, MacroGoal, GoalProgress, ContentItem, ContentCampaign,
        HealthLog, HealthGoal, Habit, HabitCheck, WorkoutSession, WorkoutSet, FoodItem,
        WorkoutRoutine, RoutineExercise, RoutineDay,
        FinanceExpense, FinanceIncome, FinanceTransfer, Account, Category, FinancePendingTransaction, FinanceSettings, GmailMessage, CareerEvent, JobOpportunity, CareerJournalEntry, BusinessEvent,
        BriefingPreference, Briefing, Insight, SavedQuote, VaultFile, VaultConflict
    )]


@pytest_asyncio.fixture(scope="session")
async def _schema():
    # Point the app's session machinery at the shared test engine. Reconfigure the
    # *existing* sessionmaker in place (routers captured it via `from ... import
    # AsyncSessionLocal` at import time) so direct-AsyncSessionLocal callers and the
    # get_db dependency all hit the same in-memory DB.
    import app.db.session as dbs
    dbs.engine = _test_engine
    dbs.AsyncSessionLocal.configure(bind=_test_engine)

    tables = _isolation_tables()
    async with _test_engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.create_all(c, tables=tables))
    yield
    async with _test_engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.drop_all(c, tables=tables))


@pytest_asyncio.fixture(scope="session")
async def app(_schema):
    from app.main import create_app
    from app.core.deps import get_db

    application = create_app()

    async def _override_get_db():
        async with TestSessionLocal() as session:
            yield session

    application.dependency_overrides[get_db] = _override_get_db
    return application


@pytest_asyncio.fixture(scope="session")
async def client(app):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def _clean_client_cookies(client):
    """The shared client is session-scoped; clear cookies before each test so a
    login in one test can't leak auth into an 'unauthenticated' test."""
    client.cookies.clear()
    yield


@pytest_asyncio.fixture
async def auth_client(client):
    """Client with a valid auth cookie (legacy dev credentials)."""
    resp = await client.post("/api/auth/login", json={"email": "admin@example.com", "password": "testpass"})
    assert resp.status_code == 200
    return client


# ── Multi-tenant isolation fixtures ─────────────────────────────────────────

async def _make_user(email: str):
    from app.models.user import User
    from app.core.security import hash_password
    user = User(email=email, name=email.split("@")[0], auth_provider="email",
                password_hash=hash_password("testpass123"))
    async with TestSessionLocal() as session:
        session.add(user)
        await session.commit()
        await session.refresh(user)
    return user


def _client_for(app, user):
    """An AsyncClient carrying a real JWT cookie for `user` (exercises get_current_user)."""
    from app.core.security import create_access_token
    token = create_access_token({"sub": str(user.id)})
    ac = AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
    ac.cookies.set("aios_token", token)
    return ac


@pytest_asyncio.fixture
async def user_a(app):
    return await _make_user(f"a-{uuid.uuid4().hex[:8]}@test.dev")


@pytest_asyncio.fixture
async def user_b(app):
    return await _make_user(f"b-{uuid.uuid4().hex[:8]}@test.dev")


@pytest_asyncio.fixture
async def client_a(app, user_a):
    async with _client_for(app, user_a) as ac:
        yield ac


@pytest_asyncio.fixture
async def client_b(app, user_b):
    async with _client_for(app, user_b) as ac:
        yield ac


@pytest.fixture
def db_session_factory():
    """Expose the test session maker for tests that need to seed rows directly."""
    return TestSessionLocal
