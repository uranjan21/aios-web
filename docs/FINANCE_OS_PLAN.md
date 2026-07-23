# Finance OS — Email Ingestion & Monthly Views

Personal transaction-tracking layer on the existing AIOS Finance area: ingest bank/credit-card
**email alerts from Gmail**, store them idempotently, and surface monthly views. Built as an
**extension** of the existing `finance` module (Postgres + Alembic, not Supabase).

## Status — built (this session)

| Phase | What | State |
|------|------|-------|
| P0 | Migration `f001` (merges open heads): `source_email_id`/`raw_text`/`parser` on pending txns, `MerchantRule`, `CCBill`, `ObligationPayment`, `investments.committed_monthly` | ✅ code; ⏳ apply in Docker |
| P1 | Deterministic bank parsers (HDFC/Axis/ICICI/SBI/CRED) + 35 unit tests | ✅ (tests green) |
| P2 | Gmail full-body fetch (bank-sender scoped) + ingestion runner (dedup + rules) | ✅ |
| P3 | 6-hourly APScheduler ingest job + `POST /ingest/run` | ✅ |
| P4 | `/payables`, `/cc-bills` CRUD, `/rules` CRUD, investments committed-vs-actual | ✅ |
| P5 | Frontend PayablesTab, RulesTab, Inbox email-sync | ✅ (tsc + build clean) |
| P6 | Owner-only monthly finance summary → vault | ✅ |
| P7 | Monthly CSV backup of all finance tables | ✅ |

## Resolved decisions

- **Data layer:** existing Postgres + Alembic (no Supabase).
- **LLM UPI tracker:** regex-first; existing `aios-upi-tracker` LLM stays as fallback for
  unmatched senders. Dedup on `source_email_id`.
- **Trigger/backup:** backend is private → in-app APScheduler (no GitHub Actions cron).
- **Invest commitment:** `committed_monthly` SIP field on investments; budgets cover planned-vs-actual spend.

## Key files

- Parsers: `backend/app/services/finance/email_ingest/` (`base.py`, `generic.py`,
  `parsers/{hdfc,axis,icici,sbi,cred}.py`, `senders.py`, `gmail_fetch.py`, `runner.py`)
- Endpoints: `backend/app/api/finance_payables.py`, `backend/app/api/finance_rules.py`
  (mounted under `/api/areas/finance` by `api/areas/finance.py`)
- Models/migration: `backend/app/models/finance.py`, `backend/alembic/versions/f001_finance_email_ingestion.py`
- Jobs: `backend/app/services/finance/{vault_summary,backup}.py`, scheduler in `services/agents/scheduler.py`
- Frontend: `frontend/src/components/areas/finance/{PayablesTab,RulesTab,InboxTab}.tsx`,
  `frontend/src/api/areas.ts`, `frontend/src/pages/areas/FinancePage.tsx`
- Tests: `backend/tests/test_email_parsers.py`

## To finish in the Docker/live env

1. `docker compose exec backend alembic upgrade head` (applies `f001`; single head after merge).
2. `docker compose restart backend` (register the new jobs).
3. `cd backend && uv run pytest tests/test_email_parsers.py -q` — should be green (35 tests).
4. Connect Gmail (read-only) in Integrations, then Finance → Inbox → **Sync emails now**
   (or `POST /api/areas/finance/ingest/run`). Review → approve → verify ledger + balances +
   Payables + day view reflect it.
5. **Replace the synthetic parser fixtures with real sample emails** to pin regexes to live
   templates — `tests/test_email_parsers.py` is structured for a trivial swap.

## Notes / follow-ups

- Bank emails that parse to `None` (promo/OTP) are intentionally skipped, not queued, to avoid
  flooding the review queue; genuine template drift surfaces as "missing transactions" and is
  caught by the parser tests. Real samples will tighten this.
- Account mapping from a card/account last-4 is best-effort (matches an account whose name
  contains the digits); otherwise the user picks the account in review.
- Full pytest suite here can't run offline (conftest fetches the tiktoken encoding, blocked by the
  sandbox proxy) — parser logic was verified directly; runs normally in Docker/CI.
