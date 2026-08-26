"""Email → pending-transaction extraction engine, shared by the two finance
email agents:

- aios-upi-tracker ("Transaction Tracker"): per-transaction ALERT emails
  (UPI, card swipes, transfers). Runs every 6h.
- aios-statement-reconciler: STATEMENT emails (periodic summaries with line
  items). Runs daily; statement lines that match an existing ledger entry
  within ±3 days at the same amount are dropped — they were already captured
  via alerts — so only unmatched lines get queued.

Both agents:
- read only is_financial gmail rows whose extracted_at is NULL (each email is
  LLM-parsed exactly once, even when it yields zero transactions);
- SKIP the LLM entirely when there is nothing new — no AI credit is metered
  on empty runs, which is what makes the 6-hourly cadence affordable;
- dedupe every parsed transaction against pending rows + the ledger before
  inserting, so re-runs and statement/alert overlap can't double-queue;
- queue into finance_pending_transactions for user review. auto_commit_at is
  set only when the user opted into timed auto-commit (finance_settings).
"""
import hashlib
import json
import logging
import uuid
from datetime import datetime, timedelta
from decimal import Decimal, InvalidOperation

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import (
    FinanceExpense,
    FinanceIncome,
    FinancePendingTransaction,
    FinanceSettings,
)
from app.services.ai.insights import generate_text
from app.services.finance.categorize import match_suggested_category
from app.services.integrations.gmail import get_unextracted_financial
from app.services.notifications.push import send_push_to_all

logger = logging.getLogger(__name__)

TRACKER_TASK = "aios-upi-tracker"
RECONCILER_TASK = "aios-statement-reconciler"
EMAIL_EXTRACTION_TASKS = {TRACKER_TASK, RECONCILER_TASK}

# statements are few but long; alerts are short but many
_BATCH_LIMIT = {TRACKER_TASK: 10, RECONCILER_TASK: 3}
_BODY_CHARS = {TRACKER_TASK: 4000, RECONCILER_TASK: 12000}
_MAX_TOKENS = {TRACKER_TASK: 1500, RECONCILER_TASK: 3000}
_MAX_TXNS_PER_RUN = 60

_JSON_CONTRACT = (
    "Output ONLY a valid JSON array (no markdown, no backticks). Each object must have exactly these keys: "
    "'amount' (float, INR), 'transaction_type' ('expense' or 'income'), "
    "'payee_name' (string — the merchant or counterparty), "
    "'suggested_category' (string — short category like Food, Transport, Shopping, Bills & Utilities, Salary), "
    "'txn_ref' (string — the UPI reference number / transaction id printed in the email, or '' if none), "
    "'logged_at' (string — 'YYYY-MM-DD' transaction date from the email), "
    "'email_index' (integer — the [N] index of the email the transaction came from). "
    "If no transactions are found, output an empty JSON array: []."
)

_PROMPTS = {
    TRACKER_TASK: (
        "You are a precise parser of Indian bank / UPI / card transaction ALERT emails. "
        "Extract every real money movement. Ignore OTPs, promotions, payment requests or reminders, "
        "balance summaries, and failed or declined transactions. " + _JSON_CONTRACT
    ),
    RECONCILER_TASK: (
        "You are a precise parser of credit card and bank STATEMENT emails. "
        "Extract each individual transaction line item listed in the statement body. "
        "Ignore totals, minimum-due amounts, reward summaries, and promotional content. " + _JSON_CONTRACT
    ),
}

_PUSH_TITLES = {TRACKER_TASK: "Transaction Tracker", RECONCILER_TASK: "Statement Reconciler"}

# Statement lines match an alert-captured ledger entry at the same amount
# within this many days (statement posting dates lag the swipe date).
_RECONCILE_WINDOW_DAYS = 3


def _dedupe_key(kind: str, logged_at: datetime, amount: Decimal, payee: str, txn_ref: str) -> str:
    if txn_ref:
        return f"ref:{txn_ref.strip().lower()}"
    raw = f"{kind}|{logged_at.date().isoformat()}|{amount:.2f}|{(payee or '').strip().lower()}"
    return "h:" + hashlib.sha1(raw.encode()).hexdigest()[:20]


async def _ledger_amount_dates(session, user_id: uuid.UUID, lo: datetime, hi: datetime) -> set:
    """(kind, date, amount) tuples from the ledger inside [lo, hi]."""
    keys = set()
    expenses = (await session.execute(
        select(FinanceExpense).where(
            FinanceExpense.user_id == user_id,
            FinanceExpense.logged_at >= lo,
            FinanceExpense.logged_at < hi,
            FinanceExpense.deleted_at.is_(None),
        )
    )).scalars().all()
    for e in expenses:
        keys.add(("expense", e.logged_at.date(), round(float(e.amount), 2)))
    income = (await session.execute(
        select(FinanceIncome).where(
            FinanceIncome.user_id == user_id,
            FinanceIncome.logged_at >= lo,
            FinanceIncome.logged_at < hi,
            FinanceIncome.deleted_at.is_(None),
        )
    )).scalars().all()
    for i in income:
        keys.add(("income", i.logged_at.date(), round(float(i.amount), 2)))
    return keys


def _in_ledger(ledger_keys: set, kind: str, logged_at: datetime, amount: Decimal, window_days: int) -> bool:
    amt = round(float(amount), 2)
    base = logged_at.date()
    for offset in range(-window_days, window_days + 1):
        if (kind, base + timedelta(days=offset), amt) in ledger_keys:
            return True
    return False


def _parse_llm_array(text: str) -> list[dict]:
    clean = text.strip()
    if clean.startswith("```json"):
        clean = clean[7:]
    if clean.startswith("```"):
        clean = clean[3:]
    if clean.endswith("```"):
        clean = clean[:-3]
    data = json.loads(clean.strip())
    if not isinstance(data, list):
        raise ValueError("LLM output was not a JSON array")
    return [t for t in data if isinstance(t, dict)]


def _email_context(messages, body_chars: int) -> str:
    blocks = []
    for idx, m in enumerate(messages):
        body = (m.body_text or m.snippet or "")[:body_chars]
        received = m.received_at.date().isoformat() if m.received_at else "unknown"
        blocks.append(
            f"[{idx}] From: {m.sender}\nSubject: {m.subject}\nDate: {received}\n"
            f"Account: {m.account_email}\nBody: {body}"
        )
    return "\n\n---\n\n".join(blocks)


async def run_email_extraction_agent(task_id: str, user_id: uuid.UUID) -> str:
    from app.models.agent import Agent
    from app.models.user import User
    from app.services.ai.keys import list_user_providers

    is_statement = task_id == RECONCILER_TASK

    async with AsyncSessionLocal() as session:
        messages = await get_unextracted_financial(
            user_id, session, limit=_BATCH_LIMIT[task_id], statement=is_statement
        )
        if not messages:
            # Skip-if-empty: no LLM call at all.
            return "No new transaction emails to process."

        user = (await session.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        agent = (await session.execute(
            select(Agent).where(Agent.user_id == user_id, Agent.task_id == task_id)
        )).scalar_one_or_none()
        has_key = user is not None and bool(await list_user_providers(session, user_id))

    if not has_key:
        # BYOK, background job: leave the messages unextracted so they are picked
        # up on the first run after the user adds a key. No raise, no retry loop.
        logger.info("Agent %s skipped for user %s — no API key configured", task_id, user_id)
        return (
            f"{len(messages)} transaction email(s) are waiting. Add your own provider "
            "API key in Settings → AI & knowledge and they will be parsed on the next run."
        )

    from app.core.config import get_settings
    settings = get_settings()
    facts = _email_context(messages, _BODY_CHARS[task_id])
    try:
        text = await generate_text(
            _PROMPTS[task_id],
            facts,
            max_tokens=_MAX_TOKENS[task_id],
            user_id=str(user_id),
            override_provider=agent.llm_provider if agent else None,
            override_openai_model=agent.openai_chat_model if agent else None,
            override_claude_model=agent.claude_model if agent else None,
            base_openai_model=settings.agent_openai_model,
            base_claude_model=settings.agent_claude_model,
        )
        transactions = _parse_llm_array(text)
    except Exception as e:
        # Messages stay unextracted and are retried next run.
        logger.warning("Agent %s extraction failed for user %s: %s", task_id, user_id, e)
        return "Could not parse transaction emails this run — will retry on the next schedule."

    queued = 0
    skipped_dupes = 0
    now = datetime.utcnow()
    async with AsyncSessionLocal() as session:
        settings_row = (await session.execute(
            select(FinanceSettings).where(FinanceSettings.user_id == user_id)
        )).scalar_one_or_none()
        auto_hours = settings_row.auto_commit_hours if settings_row else None

        existing_keys = set((await session.execute(
            select(FinancePendingTransaction.dedupe_key).where(
                FinancePendingTransaction.user_id == user_id,
                FinancePendingTransaction.dedupe_key.is_not(None),
            )
        )).scalars().all())

        # One ledger window covering every parsed date ± the reconcile window.
        dates = []
        parsed: list[tuple[dict, Decimal, str, datetime]] = []
        for tx in transactions[:_MAX_TXNS_PER_RUN]:
            try:
                amount = Decimal(str(tx.get("amount", 0)))
            except (InvalidOperation, ValueError):
                continue
            if amount <= 0:
                continue
            kind = tx.get("transaction_type") if tx.get("transaction_type") in ("expense", "income") else "expense"
            logged_at = None
            try:
                logged_at = datetime.strptime(str(tx.get("logged_at", "")), "%Y-%m-%d")
            except ValueError:
                idx = tx.get("email_index")
                if isinstance(idx, int) and 0 <= idx < len(messages) and messages[idx].received_at:
                    logged_at = messages[idx].received_at
            logged_at = logged_at or now
            parsed.append((tx, amount, kind, logged_at))
            dates.append(logged_at)

        ledger_keys = set()
        if dates:
            window = timedelta(days=_RECONCILE_WINDOW_DAYS + 1)
            ledger_keys = await _ledger_amount_dates(session, user_id, min(dates) - window, max(dates) + window)

        for tx, amount, kind, logged_at in parsed:
            payee = str(tx.get("payee_name") or "").strip()
            txn_ref = str(tx.get("txn_ref") or "").strip()
            key = _dedupe_key(kind, logged_at, amount, payee, txn_ref)
            window_days = _RECONCILE_WINDOW_DAYS if is_statement else 0
            if key in existing_keys or _in_ledger(ledger_keys, kind, logged_at, amount, window_days):
                skipped_dupes += 1
                continue
            existing_keys.add(key)

            idx = tx.get("email_index")
            source_msg = messages[idx] if isinstance(idx, int) and 0 <= idx < len(messages) else None
            category_id = await match_suggested_category(
                session, user_id, kind, tx.get("suggested_category"), payee
            )
            session.add(FinancePendingTransaction(
                user_id=user_id,
                amount=amount,
                transaction_type=kind,
                payee_name=payee or None,
                suggested_category=tx.get("suggested_category"),
                category_id=category_id,
                description=payee or None,
                logged_at=logged_at,
                raw_email_snippet=str(tx),
                dedupe_key=key,
                txn_ref=txn_ref or None,
                gmail_message_id=source_msg.gmail_id if source_msg else None,
                source_account_email=source_msg.account_email if source_msg else None,
                auto_commit_at=(now + timedelta(hours=auto_hours)) if auto_hours else None,
                status="pending",
            ))
            queued += 1

        # Mark the batch processed even when it yielded nothing — an email is
        # parsed exactly once.
        for m in messages:
            row = await session.get(type(m), m.id)
            if row:
                row.extracted_at = now
                session.add(row)
        await session.commit()

    if queued:
        try:
            from app.services.chat.tools import execute_tool
            await execute_tool(
                "append_log",
                {"area": "finance", "entry": f"{_PUSH_TITLES[task_id]} queued {queued} pending transaction(s) for review."},
                user_id,
            )
        except Exception as e:
            logger.warning("Agent %s vault log failed: %s", task_id, e)
        try:
            await send_push_to_all(
                user_id,
                _PUSH_TITLES[task_id],
                f"{queued} new transaction(s) to review",
                "/app/areas/finance",
            )
        except Exception as e:
            logger.warning("Agent %s push failed: %s", task_id, e)

    parts = [f"Processed {len(messages)} email(s): queued {queued} transaction(s) for review."]
    if skipped_dupes:
        parts.append(f"Skipped {skipped_dupes} already-tracked transaction(s).")
    return " ".join(parts)
