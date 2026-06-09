"""Extract structured data from vault markdown files."""
import re
from pathlib import Path
from typing import Optional


AREA_MAP = {
    "01-finance": "finance",
    "02-health": "health",
    "03-career": "career",
    "04-business": "business",
    "05-content": "content",
    "memory": "memory",
    "00-daily": "daily",
}

FILE_TYPE_MAP = {
    "context.md": "context",
    "log": "log",
    "plan": "plan",
}


def detect_area(rel_path: str) -> Optional[str]:
    parts = Path(rel_path).parts
    if not parts:
        return None
    for key, area in AREA_MAP.items():
        if parts[0] == key:
            return area
    return "system"


def detect_file_type(rel_path: str) -> str:
    p = Path(rel_path)
    if p.name == "context.md":
        return "context"
    if "log" in p.parts or "log" in p.name:
        return "log"
    if "plan" in p.parts or "plan" in p.name:
        return "plan"
    return "other"


def extract_frontmatter_field(content: str, field: str) -> Optional[str]:
    """Extract a value from YAML-style frontmatter or inline `field: value` lines."""
    pattern = re.compile(rf"^{re.escape(field)}\s*:\s*(.+)$", re.MULTILINE | re.IGNORECASE)
    match = pattern.search(content)
    return match.group(1).strip() if match else None


def parse_health_log_entry(line: str) -> Optional[dict]:
    """
    Parse a log line like:
    2026-06-09 — Gym: Push day, 45 min
    2026-06-09 — Weight: 78.5 kg
    """
    date_pattern = re.compile(r"(\d{4}-\d{2}-\d{2})")
    date_match = date_pattern.search(line)
    if not date_match:
        return None

    logged_at = date_match.group(1)

    if re.search(r"\bGym\b|\bWorkout\b|\bPush\b|\bPull\b|\bLegs\b", line, re.IGNORECASE):
        return {"entry_type": "gym", "logged_at": logged_at, "notes": line.strip()}
    if weight_match := re.search(r"Weight\s*:\s*(\d+\.?\d*)\s*(kg)?", line, re.IGNORECASE):
        return {"entry_type": "weight", "logged_at": logged_at, "value": float(weight_match.group(1)), "unit": "kg", "notes": line.strip()}
    if water_match := re.search(r"Water\s*:\s*(\d+\.?\d*)\s*(L|litres?)?", line, re.IGNORECASE):
        return {"entry_type": "water", "logged_at": logged_at, "value": float(water_match.group(1)), "unit": "L", "notes": line.strip()}

    return {"entry_type": "note", "logged_at": logged_at, "notes": line.strip()}


def parse_finance_expense_entry(line: str) -> Optional[dict]:
    """Parse lines like: 2026-06-09 — Food: ₹450 (Lunch)"""
    date_match = re.search(r"(\d{4}-\d{2}-\d{2})", line)
    if not date_match:
        return None

    amount_match = re.search(r"[₹Rs\.]+\s*(\d+\.?\d*)", line)
    if not amount_match:
        return None

    category_match = re.search(r"—\s*([A-Za-z ]+)\s*:", line)
    category = category_match.group(1).strip() if category_match else "Misc"

    return {
        "logged_at": date_match.group(1),
        "amount": float(amount_match.group(1)),
        "category": category,
        "description": line.strip(),
        "source": "vault_sync",
    }
