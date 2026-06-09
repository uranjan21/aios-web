"""VaultWriteGuard — all vault writes go through here. Non-negotiable."""
import logging
from pathlib import Path
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

ALLOWED_WRITE_PATHS = {
    "append_log": [
        "01-finance/log/2026.md",
        "02-health/log/2026.md",
        "03-career/log/2026.md",
        "04-business/log/2026.md",
        "05-content/log/2026.md",
        "memory/session-log.md",
        "memory/learnings.md",
        "memory/patterns.md",
    ],
    "update_context": [
        "01-finance/context.md",
        "02-health/context.md",
        "03-career/context.md",
        "04-business/context.md",
        "05-content/context.md",
        "master.md",
        "ai-entry.md",
    ],
}


class VaultWriteError(Exception):
    pass


class VaultWriteGuard:
    def __init__(self, vault_path: str):
        self._vault_path = Path(vault_path)

    def _resolve(self, rel_path: str) -> Path:
        abs_path = (self._vault_path / rel_path).resolve()
        # Prevent path traversal outside vault
        if not str(abs_path).startswith(str(self._vault_path.resolve())):
            raise VaultWriteError(f"Path traversal rejected: {rel_path}")
        return abs_path

    def append_to_log(self, rel_path: str, entry: str) -> None:
        if rel_path not in ALLOWED_WRITE_PATHS["append_log"]:
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
        """Safe read — validates path stays within vault."""
        abs_path = self._resolve(rel_path)
        if not abs_path.exists():
            return ""
        return abs_path.read_text(encoding="utf-8")
