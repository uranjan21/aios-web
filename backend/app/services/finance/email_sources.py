"""Curated senders + subject keywords that mark a Gmail message as financial.

Used to build the targeted Gmail search for the transaction-tracker sync: only
messages matching this query get their FULL BODY fetched and stored (the
general inbox sweep stays metadata-only). Extend the sender list as users
report banks whose alerts are missed — subject keywords are the safety net.
"""

# Indian banks, card issuers, UPI apps and wallets that send transaction
# alerts / statements. Entries are matched with Gmail's from: operator, so
# bare domains match any sender at that domain.
FINANCIAL_SENDERS = [
    # Banks
    "hdfcbank.net",
    "hdfcbank.com",
    "icicibank.com",
    "sbi.co.in",
    "sbicard.com",
    "axisbank.com",
    "kotak.com",
    "yesbank.in",
    "idfcfirstbank.com",
    "indusind.com",
    "federalbank.co.in",
    "rblbank.com",
    "aubank.in",
    # Card / fintech issuers
    "onecard.co",
    "sliceit.com",
    "cred.club",
    "jupiter.money",
    "fi.money",
    # UPI apps & wallets
    "phonepe.com",
    "paytm.com",
    "paytmbank.com",
    "amazonpay.in",
    "payments-noreply@google.com",  # Google Pay
]

FINANCIAL_SUBJECT_TERMS = [
    "debited",
    "credited",
    "transaction alert",
    "transaction confirmation",
    "payment successful",
    "payment received",
    "upi",
    "statement",
    "spent on your",
    "withdrawn",
]


def financial_gmail_query(newer_than_days: int = 7) -> str:
    froms = " OR ".join(FINANCIAL_SENDERS)
    subjects = " OR ".join(
        f'"{term}"' if " " in term else term for term in FINANCIAL_SUBJECT_TERMS
    )
    return f"newer_than:{newer_than_days}d (from:({froms}) OR subject:({subjects}))"
