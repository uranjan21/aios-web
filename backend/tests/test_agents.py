import pytest
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from sqlmodel import select

from app.models.finance import FinanceExpense, FinanceIncome
from app.models.health import HealthLog
from app.models.content import ContentItem
from app.models.career import CareerEvent
from app.models.business import BusinessEvent
from app.models.workspace import Task
from app.services.insights.digest import (
    _week_facts_finance,
    _week_facts_health,
    _week_facts_content,
    _week_facts_career_business,
    _week_facts
)
from app.services.agents.runners import _build_context, run_agent_task, FALLBACK_WARNING_PREFIX, _AGENT_DOMAINS


@pytest.mark.asyncio
async def test_domain_scoped_facts(user_a, db_session_factory):
    now = datetime.utcnow()
    week_start = now - timedelta(days=7)

    async with db_session_factory() as db:
        # Seed finance
        db.add(FinanceExpense(user_id=user_a.id, amount=1500, category="Food", logged_at=now))
        db.add(FinanceIncome(user_id=user_a.id, amount=5000, source="Salary", logged_at=now))
        # Seed health
        db.add(HealthLog(user_id=user_a.id, entry_type="gym", logged_at=now))
        db.add(HealthLog(user_id=user_a.id, entry_type="sleep", value="8.0", logged_at=now))
        # Seed content
        db.add(ContentItem(user_id=user_a.id, title="Blog Post", platform="twitter", status="published", updated_at=now))
        # Seed career & business
        db.add(CareerEvent(user_id=user_a.id, title="Promotion", event_type="milestone", occurred_at=now))
        db.add(BusinessEvent(user_id=user_a.id, title="Sale", event_type="revenue", occurred_at=now))
        await db.commit()

    async with db_session_factory() as db:
        finance_facts = await _week_facts_finance(db, user_a.id, week_start)
        assert "FINANCE" in finance_facts
        assert "1,500" in finance_facts
        assert "5,000" in finance_facts

        health_facts = await _week_facts_health(db, user_a.id, week_start)
        assert "HEALTH" in health_facts
        assert "1 gym sessions" in health_facts
        assert "avg sleep 8.0h" in health_facts

        content_facts = await _week_facts_content(db, user_a.id, week_start)
        assert "CONTENT" in content_facts
        assert "1 piece(s)" in content_facts

        career_biz_facts = await _week_facts_career_business(db, user_a.id, week_start)
        assert "CAREER/BUSINESS" in career_biz_facts
        assert "1 career event(s)" in career_biz_facts
        assert "1 business event(s)" in career_biz_facts

        aggregated = await _week_facts(db, user_a.id)
        assert "Week ending" in aggregated
        assert "FINANCE" in aggregated
        assert "HEALTH" in aggregated
        assert "CONTENT" in aggregated
        assert "CAREER/BUSINESS" in aggregated


@pytest.mark.asyncio
async def test_build_context_scoped(user_a, db_session_factory):
    now = datetime.utcnow()
    async with db_session_factory() as db:
        db.add(FinanceExpense(user_id=user_a.id, amount=2000, category="Rent", logged_at=now))
        db.add(HealthLog(user_id=user_a.id, entry_type="gym", logged_at=now))
        await db.commit()

    # For finance task, health facts should not be in the context
    context_finance = await _build_context("aios-upi-tracker", user_a.id)
    assert "FINANCE" in context_finance
    assert "HEALTH" not in context_finance

    # For health task, finance facts should not be in the context
    context_health = await _build_context("aios-health-coach", user_a.id)
    assert "HEALTH" in context_health
    assert "FINANCE" not in context_health

    # For general task, both should be present
    context_general = await _build_context("aios-morning-brief", user_a.id)
    assert "FINANCE" in context_general
    assert "HEALTH" in context_general


@pytest.mark.asyncio
async def test_agent_run_fallback_quota_exceeded(user_a, db_session_factory, monkeypatch):
    from app.services.billing.usage import record_ai_usage
    from app.core.config import get_settings
    
    s = get_settings()
    monkeypatch.setattr(s, "environment", "production")
    monkeypatch.setattr(s, "ai_free_monthly_credits", 2)

    async with db_session_factory() as db:
        # Exceed quota
        await record_ai_usage(db, user_a.id, 3, "chat")
        await db.commit()

    output = await run_agent_task("aios-health-coach", user_a.id)
    assert output.startswith(FALLBACK_WARNING_PREFIX)
    assert "HEALTH" in output


@pytest.mark.asyncio
async def test_agent_run_fallback_llm_failure(user_a, db_session_factory, monkeypatch):
    from app.services.billing.usage import record_ai_usage
    from app.core.config import get_settings
    
    s = get_settings()
    monkeypatch.setattr(s, "ai_free_monthly_credits", 100) # under quota

    # Mock generate_text to fail
    async def mock_generate_text(*args, **kwargs):
        raise Exception("LLM call timed out")

    monkeypatch.setattr("app.services.agents.runners.generate_text", mock_generate_text)

    output = await run_agent_task("aios-health-coach", user_a.id)
    assert output.startswith(FALLBACK_WARNING_PREFIX)
    assert "HEALTH" in output


@pytest.mark.asyncio
async def test_agent_run_fallback_no_cross_domain_leak(user_a, db_session_factory, monkeypatch):
    from app.core.config import get_settings
    
    s = get_settings()
    monkeypatch.setattr(s, "ai_free_monthly_credits", 100) # under quota

    # Mock generate_text to fail so we trigger fallback mode
    async def mock_generate_text(*args, **kwargs):
        raise Exception("LLM call failed")

    monkeypatch.setattr("app.services.agents.runners.generate_text", mock_generate_text)

    now = datetime.utcnow()
    async with db_session_factory() as db:
        # Seed both health and finance data
        db.add(FinanceExpense(user_id=user_a.id, amount=9999, category="Secret_Finance_Log", logged_at=now))
        db.add(HealthLog(user_id=user_a.id, entry_type="sleep", value="7.5", logged_at=now))
        await db.commit()

    # Run health coach in fallback mode
    output_health = await run_agent_task("aios-health-coach", user_a.id)
    assert output_health.startswith(FALLBACK_WARNING_PREFIX)
    assert "HEALTH" in output_health
    assert "7.5" in output_health
    assert "9999" not in output_health
    assert "Secret_Finance_Log" not in output_health
    assert "FINANCE" not in output_health

    # Run monthly finance in fallback mode
    output_finance = await run_agent_task("aios-monthly-finance", user_a.id)
    assert output_finance.startswith(FALLBACK_WARNING_PREFIX)
    assert "FINANCE" in output_finance
    assert "9,999" in output_finance
    assert "HEALTH" not in output_finance
    assert "7.5" not in output_finance


@pytest.mark.asyncio
async def test_agent_run_fallback_all_domains_no_leak(user_a, db_session_factory, monkeypatch):
    from app.core.config import get_settings
    
    s = get_settings()
    monkeypatch.setattr(s, "ai_free_monthly_credits", 100) # under quota

    # Mock generate_text to fail so we trigger fallback mode
    async def mock_generate_text(*args, **kwargs):
        raise Exception("LLM call failed")

    monkeypatch.setattr("app.services.agents.runners.generate_text", mock_generate_text)

    now = datetime.utcnow()
    async with db_session_factory() as db:
        # Seed ALL domains with unique secret marker values
        db.add(FinanceExpense(user_id=user_a.id, amount=7777, category="Secret_Finance_Marker", logged_at=now))
        db.add(HealthLog(user_id=user_a.id, entry_type="sleep", value="9.9", logged_at=now))
        db.add(ContentItem(user_id=user_a.id, title="Secret_Content_Marker", platform="twitter", status="published", updated_at=now))
        db.add(CareerEvent(user_id=user_a.id, title="Secret_Career_Marker", event_type="milestone", occurred_at=now))
        db.add(BusinessEvent(user_id=user_a.id, title="Secret_Business_Marker", event_type="revenue", occurred_at=now))
        await db.commit()

    # Define markers for each domain
    markers = {
        "finance": ["Secret_Finance_Marker", "7,777", "FINANCE"],
        "health": ["9.9", "HEALTH"],
        "content": ["Secret_Content_Marker", "CONTENT"],
        "career_business": ["Secret_Career_Marker", "Secret_Business_Marker", "CAREER/BUSINESS"]
    }

    # Verify each agent
    for agent_id, domain in _AGENT_DOMAINS.items():
        if agent_id == "aios-vault-extractor":
            continue
        output = await run_agent_task(agent_id, user_a.id)
        assert output.startswith(FALLBACK_WARNING_PREFIX)
        
        if domain == "general":
            # General agents can/should have everything
            continue
            
        # Verify that only the relevant domain markers are in the output, and no other domain markers leak
        for d, m_list in markers.items():
            if d == domain:
                if d == "career_business":
                    assert "CAREER/BUSINESS" in output
                else:
                    assert d.upper() in output
            else:
                # Other domains must NOT leak
                for marker in m_list:
                    assert marker not in output, f"Leak: marker {marker} of domain {d} found in agent {agent_id} (domain {domain})"


@pytest.mark.asyncio
async def test_agent_executes_writeback_actions(user_a, db_session_factory, monkeypatch):
    async def mock_generate_text(*args, **kwargs):
        return (
            "Weekly health check complete.\n\n"
            "<aios-actions>"
            '[{"tool":"create_action","input":{"title":"Book physio consult","description":"Knee pain kept recurring","domain":"health","priority":"high"}}]'
            "</aios-actions>"
        )

    monkeypatch.setattr("app.services.agents.runners.generate_text", mock_generate_text)
    async def mock_ai_allowed(*args, **kwargs):
        return True

    monkeypatch.setattr("app.services.billing.usage.ai_allowed", mock_ai_allowed)

    # Vault mirroring is owner-only; make user_a the owner for this test.
    async def mock_is_vault_owner(user_id):
        return True

    monkeypatch.setattr("app.services.chat.tools.is_vault_owner", mock_is_vault_owner)

    output = await run_agent_task("aios-health-coach", user_a.id)
    assert "Weekly health check complete." in output
    assert "Actions executed:" in output
    assert "create_action: Created task" in output
    assert "Vault files updated:" in output
    assert "02-health/log/2026.md" in output

    async with db_session_factory() as db:
        task = (
            await db.execute(
                select(Task).where(Task.user_id == user_a.id, Task.title == "Book physio consult")
            )
        ).scalar_one_or_none()
        assert task is not None
        assert task.domain == "health"

    vault_path = Path("/tmp/vault-test/02-health/log/2026.md")
    assert vault_path.exists()
    assert "Book physio consult" in vault_path.read_text(encoding="utf-8")
