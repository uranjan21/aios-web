"""Ingestion runner: fetch bank emails → parse → dedup insert into the review queue.

Regex-first (Decision B): deterministic parsers handle the known bank senders here. Emails that
parse to a transaction/bill are queued for review; promo/OTP mail (no txn verb) is skipped, not
queued. Idempotent via source_email_id — safe to re-run within the fetch window.
"""
from __future__ import annotations

import logging
import re
import uuid
from datetime import datetime, timedelta

from sqlmodel import select

from app.db.session import AsyncSessionLocal
from app.models.finance import (
    Account,
    CCBill,
    Category,
    FinancePendingTransaction,
    MerchantRule,
)
from app.services.finance.email_ingest.base import ParsedCCBill, ParsedTxn
from app.services.finance.email_ingest.gmail_fetch import fetch_bank_emails
from app.services.finance.email_ingest.senders import parse_email

logger = logging.getLogger(__name__)

AUTO_COMMIT_HOURS = 24


def _rule_matches(rule: MerchantRule, text: str) -> bool:
    if not text:
        return False
    hay = text.lower()
    pat = rule.pattern.lower()
    if rule.match_type == "equals":
        return hay.strip() == pat.strip()
    if rule.match_type == "regex":
        try:
            return re.search(rule.pattern, text, re.IGNORECASE) is not None
        except re.error:
            return False
    return pat in hay  # "contains" (default)


async def _apply_rules(session, user_id, text: str):
    """Return (category_name, category_id, account_id) from the first matching active rule."""
    rules = (
        await session.execute(
            select(MerchantRule)
            .where(MerchantRule.user_id == user_id, MerchantRule.is_active == True)  # noqa: E712
            .order_by(MerchantRule.priority.desc())
        )
    ).scalars().all()
    for rule in rules:
        if _rule_matches(rule, text):
            cat_name = None
            if rule.category_id:
                cat = (
                    await session.execute(
                        select(Category).where(Category.id == rule.category_id)
                    )
                ).scalar_one_or_none()
                cat_name = cat.name if cat else None
            return cat_name, rule.category_id, rule.account_id
    return None, None, None


async def _account_for_hint(session, user_id, hint: str | None):
    """Best-effort: map a card/account last-4 to an existing account whose name mentions it."""
    if not hint:
        return None
    accounts = (
        await session.execute(select(Account).where(Account.user_id == user_id))
    ).scalars().all()
    for acc in accounts:
        if hint in (acc.name or ""):
            return acc.id
    return None


async def run_ingestion(user_id: uuid.UUID, newer_than_days: int = 3) -> dict:
    """Fetch + parse + queue new transactions/CC bills for one user. Returns counts."""
    result = {"fetched": 0, "txns_queued": 0, "cc_bills_queued": 0, "skipped_dupes": 0}
    async with AsyncSessionLocal() as session:
        try:
            emails = await fetch_bank_emails(user_id, session, newer_than_days)
        except ValueError as e:
            logger.info("Ingestion skipped for %s: %s", user_id, e)
            return result
        result["fetched"] = len(emails)

        # Pre-load already-ingested email ids (both queues) for dedup.
        seen_txn = {
            r for (r,) in (
                await session.execute(
                    select(FinancePendingTransaction.source_email_id).where(
                        FinancePendingTransaction.user_id == user_id,
                        FinancePendingTransaction.source_email_id.is_not(None),
                    )
                )
            ).all()
        }
        seen_bill = {
            r for (r,) in (
                await session.execute(
                    select(CCBill.source_email_id).where(
                        CCBill.user_id == user_id, CCBill.source_email_id.is_not(None)
                    )
                )
            ).all()
        }

        now = datetime.utcnow()
        for email in emails:
            eid = email["id"]
            parsed = parse_email(email["subject"], email["body"], email["from"])
            if parsed is None:
                continue  # promo/OTP/unhandled — skip, don't flood the queue

            if isinstance(parsed, ParsedTxn):
                if eid in seen_txn:
                    result["skipped_dupes"] += 1
                    continue
                text = " ".join(filter(None, [parsed.payee_name, email["subject"]]))
                cat_name, _cat_id, acc_id = await _apply_rules(session, user_id, text)
                if acc_id is None:
                    acc_id = await _account_for_hint(session, user_id, parsed.account_hint)
                session.add(
                    FinancePendingTransaction(
                        user_id=user_id,
                        amount=parsed.amount,
                        transaction_type=parsed.direction,
                        payee_name=parsed.payee_name,
                        suggested_category=cat_name,
                        account_id=acc_id,
                        description=parsed.payee_name,
                        logged_at=parsed.occurred_at or now,
                        raw_email_snippet=(email["body"] or "")[:500],
                        source_email_id=eid,
                        raw_text=email["body"],
                        parser=parsed.parser,
                        auto_commit_at=now + timedelta(hours=AUTO_COMMIT_HOURS),
                        status="pending",
                    )
                )
                seen_txn.add(eid)
                result["txns_queued"] += 1

            elif isinstance(parsed, ParsedCCBill):
                if eid in seen_bill:
                    result["skipped_dupes"] += 1
                    continue
                acc_id = await _account_for_hint(session, user_id, parsed.card_hint)
                session.add(
                    CCBill(
                        user_id=user_id,
                        account_id=acc_id,
                        card_name=parsed.card_name,
                        statement_date=parsed.statement_date.date() if parsed.statement_date else None,
                        due_date=parsed.due_date.date() if parsed.due_date else None,
                        total_due=parsed.total_due,
                        min_due=parsed.min_due,
                        unbilled=parsed.unbilled,
                        source_email_id=eid,
                    )
                )
                seen_bill.add(eid)
                result["cc_bills_queued"] += 1

        await session.commit()
    logger.info("Ingestion for %s: %s", user_id, result)
    return result
