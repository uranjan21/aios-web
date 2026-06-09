import asyncio
import logging
from pathlib import Path
from typing import Callable, Awaitable

from watchdog.events import FileSystemEventHandler, FileSystemEvent
from watchdog.observers import Observer

logger = logging.getLogger(__name__)

IGNORE_PATTERNS = {".git", ".obsidian", ".DS_Store", ".tmp"}
DEBOUNCE_SECONDS = 2.0


def _should_ignore(path: str) -> bool:
    p = Path(path)
    if not p.suffix == ".md":
        return True
    if ".conflict-" in p.name:
        return True
    for part in p.parts:
        if part in IGNORE_PATTERNS:
            return True
    return False


class _DebounceHandler(FileSystemEventHandler):
    def __init__(self, loop: asyncio.AbstractEventLoop, callback: Callable[[str, str], Awaitable[None]]):
        super().__init__()
        self._loop = loop
        self._callback = callback
        self._pending: dict[str, asyncio.TimerHandle] = {}

    def _schedule(self, path: str, change_type: str) -> None:
        if _should_ignore(path):
            return
        key = path

        def fire():
            self._pending.pop(key, None)
            asyncio.run_coroutine_threadsafe(self._callback(path, change_type), self._loop)

        existing = self._pending.pop(key, None)
        if existing:
            existing.cancel()
        handle = self._loop.call_later(DEBOUNCE_SECONDS, fire)
        self._pending[key] = handle

    def on_modified(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._schedule(event.src_path, "modified")

    def on_created(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._schedule(event.src_path, "created")

    def on_deleted(self, event: FileSystemEvent) -> None:
        if not event.is_directory:
            self._schedule(event.src_path, "deleted")


class VaultWatcher:
    def __init__(self, vault_path: str, callback: Callable[[str, str], Awaitable[None]]):
        self._vault_path = vault_path
        self._callback = callback
        self._observer: Observer | None = None

    def start(self, loop: asyncio.AbstractEventLoop) -> None:
        handler = _DebounceHandler(loop, self._callback)
        self._observer = Observer()
        self._observer.schedule(handler, self._vault_path, recursive=True)
        self._observer.start()
        logger.info("Vault watcher started on %s", self._vault_path)

    def stop(self) -> None:
        if self._observer:
            self._observer.stop()
            self._observer.join()
            logger.info("Vault watcher stopped")
