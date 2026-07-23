"""Unit tests for the bank email parsers — the riskiest part of Finance OS ingestion.

Fixtures follow the standard bank/CC alert templates with SYNTHETIC data (no real PII).
⚠️ Replace/extend with Utsav's real sample email bodies to pin regexes to live templates —
the parser architecture (independent field extraction) makes swapping fixtures trivial.
"""
from datetime import datetime
from decimal import Decimal

import pytest

from app.services.finance.email_ingest import parse_email
from app.services.finance.email_ingest.base import (
    ParsedCCBill,
    ParsedTxn,
    parse_amount,
    parse_datetime,
)
from app.services.finance.email_ingest.senders import gmail_from_query, match_sender

HDFC = "HDFC Bank Alerts <alerts@hdfcbank.net>"
AXIS = "Axis Bank <alerts@axisbank.com>"
ICICI = "ICICI Bank <credit_cards@icicibank.com>"
SBI = "SBI Card <Statements@sbicard.com>"
CRED = "CRED <noreply@cred.club>"


# ── Amount helper ─────────────────────────────────────────────────────────────
@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Rs.1,234.56", Decimal("1234.56")),
        ("INR 1,23,456.78", Decimal("123456.78")),
        ("₹500", Decimal("500.00")),
        ("Rs 2,499.00", Decimal("2499.00")),
        ("1.2k", Decimal("1200.00")),
        ("2L", Decimal("200000.00")),
        ("Rs. 0.00", None),   # zero rejected
        ("free", None),       # junk rejected
        ("", None),
    ],
)
def test_parse_amount(raw, expected):
    assert parse_amount(raw) == expected


# ── Date helper ───────────────────────────────────────────────────────────────
def test_parse_datetime_numeric_with_time():
    assert parse_datetime("15-07-2026", "20:15:33") == datetime(2026, 7, 15, 20, 15, 33)


def test_parse_datetime_two_digit_year():
    assert parse_datetime("15-07-26") == datetime(2026, 7, 15, 0, 0, 0)


def test_parse_datetime_textual_month_no_year_defaults_current():
    dt = parse_datetime("05 Aug")
    assert dt is not None and dt.month == 8 and dt.day == 5 and dt.year == datetime.now().year


def test_parse_datetime_invalid():
    assert parse_datetime("not-a-date") is None
    assert parse_datetime("45-13-2026") is None


# ── HDFC credit-card spend ────────────────────────────────────────────────────
def test_hdfc_credit_card_spend():
    body = (
        "Dear Customer, A payment was made using your HDFC Bank Credit Card ending 1234 "
        "for Rs. 2,499.00 at AMAZON INDIA on 15-07-2026 20:15:33. Not you? Call 18002586161."
    )
    r = parse_email("Alert: Update on your HDFC Bank Credit Card", body, HDFC)
    assert isinstance(r, ParsedTxn)
    assert r.direction == "expense"
    assert r.amount == Decimal("2499.00")
    assert r.account_hint == "1234"
    assert r.payee_name == "AMAZON INDIA"
    assert r.occurred_at == datetime(2026, 7, 15, 20, 15, 33)
    assert r.parser == "hdfc"


# ── HDFC UPI debit ────────────────────────────────────────────────────────────
def test_hdfc_upi_debit():
    body = (
        "Dear Customer, Rs.500.00 has been debited from your account XXXX1234 to VPA "
        "merchant@okhdfcbank on 15-07-26. Your UPI transaction reference number is 456789012345."
    )
    r = parse_email("You have done a UPI txn", body, HDFC)
    assert isinstance(r, ParsedTxn)
    assert r.direction == "expense"
    assert r.amount == Decimal("500.00")
    assert r.payee_name == "merchant@okhdfcbank"
    assert r.account_hint == "1234"


# ── HDFC UPI credit → income ──────────────────────────────────────────────────
def test_hdfc_upi_credit_is_income():
    body = (
        "Dear Customer, Rs.1,000.00 is credited to your account XXXX1234 from VPA "
        "sender@okaxis on 15-07-26. UPI ref 456789012345."
    )
    r = parse_email("UPI credit alert", body, HDFC)
    assert isinstance(r, ParsedTxn)
    assert r.direction == "income"
    assert r.amount == Decimal("1000.00")


# ── HDFC statement summary → CC bill ──────────────────────────────────────────
def test_hdfc_statement_summary():
    body = (
        "Dear Customer, Your HDFC Bank Credit Card statement is generated. "
        "Total Amount Due Rs. 12,345.67 Minimum Amount Due Rs. 617.00 "
        "Payment Due Date 05-08-2026. Card ending 1234."
    )
    r = parse_email("Your HDFC Bank Credit Card Statement", body, HDFC)
    assert isinstance(r, ParsedCCBill)
    assert r.total_due == Decimal("12345.67")
    assert r.min_due == Decimal("617.00")
    assert r.due_date == datetime(2026, 8, 5, 0, 0, 0)
    assert r.card_hint == "1234"


# ── Other banks (shared generic extraction) ───────────────────────────────────
def test_axis_card_spend():
    body = "Dear Customer, INR 750.00 spent on your Axis Bank Credit Card no. XX5678 at SWIGGY on 14/07/2026."
    r = parse_email("Transaction alert", body, AXIS)
    assert isinstance(r, ParsedTxn)
    assert r.amount == Decimal("750.00")
    assert r.account_hint == "5678"
    assert r.payee_name == "SWIGGY"


def test_icici_card_spend():
    body = "Rs 1,299.00 has been spent on your ICICI Bank Credit Card XX9012 at FLIPKART on 13-07-2026."
    r = parse_email("ICICI Bank Transaction", body, ICICI)
    assert isinstance(r, ParsedTxn)
    assert r.amount == Decimal("1299.00")
    assert r.payee_name == "FLIPKART"


def test_sbi_card_spend_charged_keyword():
    body = "Your SBI Card ending 3456 was charged Rs. 999.00 at NETFLIX on 12-07-2026."
    r = parse_email("Transaction Alert", body, SBI)
    assert isinstance(r, ParsedTxn)
    assert r.direction == "expense"
    assert r.amount == Decimal("999.00")
    assert r.account_hint == "3456"
    assert r.payee_name == "NETFLIX"


# ── CRED bill reminder → CC bill ──────────────────────────────────────────────
def test_cred_bill_reminder():
    body = "Your HDFC Bank credit card bill of Rs. 12,345 is due on 05 Aug. Pay now on CRED."
    r = parse_email("Your credit card bill is due", body, CRED)
    assert isinstance(r, ParsedCCBill)
    assert r.total_due == Decimal("12345.00")
    assert r.due_date is not None and r.due_date.month == 8 and r.due_date.day == 5


# ── Negative cases ────────────────────────────────────────────────────────────
def test_unknown_sender_returns_none():
    body = "Rs.500.00 debited at SHOP on 15-07-2026."
    assert parse_email("spend", body, "friend@gmail.com") is None


def test_promo_email_from_bank_not_parsed():
    # From a bank sender but no transaction verb → must not create a bogus expense.
    body = "Get Rs 500 cashback on your HDFC Bank Credit Card this festive season! Offer ends soon."
    assert parse_email("Festive offer", body, HDFC) is None


def test_otp_email_not_parsed():
    body = "123456 is your OTP for a transaction of Rs. 2,000.00. Do not share it with anyone."
    # Contains 'transaction' but none of the debit/credit verbs → not parsed.
    assert parse_email("OTP", body, HDFC) is None


# ── Sender registry ───────────────────────────────────────────────────────────
def test_match_sender():
    assert match_sender(HDFC) is not None
    assert match_sender("random@example.com") is None


def test_gmail_from_query_lists_all_banks():
    q = gmail_from_query()
    for domain in ("hdfcbank.net", "axisbank.com", "icicibank.com", "sbicard.com", "cred.club"):
        assert domain in q
