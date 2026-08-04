"""VaultWriteGuard — all vault writes go through here. Non-negotiable."""
import logging
import re
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

"""
Area logs are per-YEAR files. They used to be listed literally as
`01-finance/log/2026.md`, which meant that from 2027-01-01 every append would
have kept landing in the 2026 file — silently, since the path stayed on the
allowlist and the write succeeded.

Matching a pattern rather than a literal also means the guard does not need to
know today's date. Computing the allowlist once at import would have the same
bug in slow motion: a process started in December keeps a stale year until it
restarts.

The pattern is deliberately narrow — a fixed set of area folders, `log/`, and
exactly four digits — so it grants no more reach than the literals did.
"""
_YEAR_LOG_RE = re.compile(
    r"^(?:01-finance|02-health|03-career|04-business|05-content)/log/\d{4}\.md$"
)

ALLOWED_WRITE_PATHS = {
    "append_log": [
        "memory/session-log.md",
        "memory/learnings.md",
        "memory/patterns.md",
    ],
    "update_context": [
        "01-finance/context.md",
        "01-finance/monthly-summary.md",
        "02-health/context.md",
        "03-career/context.md",
        "04-business/context.md",
        "05-content/context.md",
        "master.md",
        "ai-entry.md",
    ],
}


def is_append_allowed(rel_path: str) -> bool:
    """Appends go to a fixed memory file or to any area's year log."""
    return rel_path in ALLOWED_WRITE_PATHS["append_log"] or bool(_YEAR_LOG_RE.match(rel_path))


def is_read_allowed(rel_path: str) -> bool:
    return (
        is_append_allowed(rel_path)
        or rel_path in ALLOWED_WRITE_PATHS["update_context"]
        or rel_path == "05-content/pipeline/twitter-queue.md"
    )


class VaultWriteError(Exception):
    pass


class VaultWriteGuard:
    def __init__(self, vault_path: str):
        self._vault_path = Path(vault_path)
        self._vault_path.mkdir(parents=True, exist_ok=True)

    def _resolve(self, rel_path: str) -> Path:
        abs_path = (self._vault_path / rel_path).resolve()
        # Prevent path traversal outside vault
        if not abs_path.is_relative_to(self._vault_path.resolve()):
            raise VaultWriteError(f"Path traversal rejected: {rel_path}")
        return abs_path

    def append_to_log(self, rel_path: str, entry: str) -> None:
        if not is_append_allowed(rel_path):
            raise VaultWriteError(f"Append not allowed on: {rel_path}")
        if not entry.strip():
            raise VaultWriteError("Empty append content rejected")

        abs_path = self._resolve(rel_path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        formatted_entry = f"\n{timestamp} — {entry.strip()}\n"

        current = abs_path.read_text(encoding="utf-8") if abs_path.exists() else ""
        new_content = current + formatted_entry

        # Atomic write: tmp → rename (never partial write)
        tmp = abs_path.with_suffix(".tmp")
        tmp.write_text(new_content, encoding="utf-8")
        tmp.rename(abs_path)
        logger.info("Appended to vault log: %s", rel_path)

    def update_context(self, rel_path: str, new_content: str) -> None:
        if rel_path not in ALLOWED_WRITE_PATHS["update_context"]:
            raise VaultWriteError(f"Update not allowed on: {rel_path}")
        if not new_content.strip():
            raise VaultWriteError("Empty context update rejected")

        abs_path = self._resolve(rel_path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        tmp = abs_path.with_suffix(".tmp")
        tmp.write_text(new_content, encoding="utf-8")
        tmp.rename(abs_path)
        logger.info("Updated vault context: %s", rel_path)

    def read_file(self, rel_path: str) -> str:
        """Safe read — restricted to the known context/log allowlist."""
        if not is_read_allowed(rel_path):
            raise VaultWriteError(f"Read not allowed on: {rel_path}")
        abs_path = self._resolve(rel_path)
        if not abs_path.exists():
            return ""
        return abs_path.read_text(encoding="utf-8")

    def write_file(self, rel_path: str, content: str) -> None:
        """Write content to a file in the vault. Used for conflict resolution."""
        if not is_read_allowed(rel_path):
            raise VaultWriteError(f"Write not allowed on: {rel_path}")
        abs_path = self._resolve(rel_path)
        abs_path.parent.mkdir(parents=True, exist_ok=True)

        # Atomic write: tmp → rename
        tmp = abs_path.with_suffix(".tmp")
        tmp.write_text(content, encoding="utf-8")
        tmp.rename(abs_path)
        logger.info("Wrote file to vault: %s", rel_path)
