import pytest
import os
import shutil
from pathlib import Path
from uuid import uuid4, UUID
from decimal import Decimal
from sqlmodel import select, SQLModel

from app.core.config import get_settings
from app.services.vault_sync.writer import VaultWriteGuard, VaultWriteError, is_append_allowed
from app.services.chat.tools import execute_tool
from app.models.vault import VaultFile, VaultConflict
from app.db.session import AsyncSessionLocal
from app.api.sync import resolve_conflict, ResolveRequest, ResolutionState

# 1. Test File Handling: Vault folder and subfolder creation
@pytest.mark.asyncio
async def test_vault_path_creation():
    settings = get_settings()
    test_vault_path = "/tmp/vault-adversarial-test-unique-path"
    
    # Ensure it doesn't exist initially
    if os.path.exists(test_vault_path):
        shutil.rmtree(test_vault_path)
        
    assert not os.path.exists(test_vault_path)
    
    # Initializing VaultWriteGuard must create settings.vault_path
    guard = VaultWriteGuard(test_vault_path)
    assert os.path.exists(test_vault_path)
    assert os.path.isdir(test_vault_path)
    
    # Check that it auto-creates parent folders inside the vault when appending/updating
    rel_log_path = "01-finance/log/2026.md"
    assert not os.path.exists(os.path.join(test_vault_path, "01-finance/log"))
    
    guard.append_to_log(rel_log_path, "Test entry")
    assert os.path.exists(os.path.join(test_vault_path, "01-finance/log"))
    assert os.path.exists(os.path.join(test_vault_path, rel_log_path))
    
    # Clean up
    shutil.rmtree(test_vault_path)

# 2. Test Directory Traversal Prevention
@pytest.mark.asyncio
async def test_directory_traversal_guards():
    settings = get_settings()
    test_vault_path = "/tmp/vault-adversarial-test-traversal"
    
    if os.path.exists(test_vault_path):
        shutil.rmtree(test_vault_path)
    os.makedirs(test_vault_path, exist_ok=True)
    
    guard = VaultWriteGuard(test_vault_path)
    
    # Traversal inputs to test
    unsafe_paths = [
        "../../unsafe.md",
        "../vault-adversarial-test-traversal-sibling/unsafe.md",
        "/etc/passwd",
        "/tmp/unsafe.md",
        "01-finance/../../../etc/passwd"
    ]
    
    # Ensure they are blocked by _resolve traversal check or allowlist check
    for path in unsafe_paths:
        # Test append_to_log
        with pytest.raises(VaultWriteError) as exc_info:
            guard.append_to_log(path, "Malicious write")
        assert "not allowed" in str(exc_info.value) or "Path traversal rejected" in str(exc_info.value)
        
        # Test update_context
        with pytest.raises(VaultWriteError) as exc_info:
            guard.update_context(path, "Malicious write")
        assert "not allowed" in str(exc_info.value) or "Path traversal rejected" in str(exc_info.value)

        # Test read_file
        with pytest.raises(VaultWriteError) as exc_info:
            guard.read_file(path)
        assert "not allowed" in str(exc_info.value) or "Path traversal rejected" in str(exc_info.value)
        
        # Let's test the internal _resolve method directly to bypass the allowlist checks
        with pytest.raises(VaultWriteError) as exc_info:
            guard._resolve(path)
        assert "Path traversal rejected" in str(exc_info.value)

    # Clean up
    shutil.rmtree(test_vault_path)

# 3. Test Safe Traversal (resolving inside the vault)
@pytest.mark.asyncio
async def test_safe_traversal():
    settings = get_settings()
    test_vault_path = "/tmp/vault-adversarial-test-safe-traversal"
    
    if os.path.exists(test_vault_path):
        shutil.rmtree(test_vault_path)
    os.makedirs(test_vault_path, exist_ok=True)
    
    guard = VaultWriteGuard(test_vault_path)
    
    # A path that has traversal dots but resolves INSIDE the vault
    safe_rel_path = "01-finance/../01-finance/log/2026.md"
    
    # Let's see if _resolve resolves it safely. Resolve both paths first to handle symlinks (like /tmp -> /private/tmp)
    resolved = guard._resolve(safe_rel_path)
    expected = (Path(test_vault_path).resolve() / "01-finance/log/2026.md").resolve()
    assert resolved == expected
    
    # Clean up
    shutil.rmtree(test_vault_path)

# 4. Test Missing write_file Method in Conflict Resolution
@pytest.mark.asyncio
async def test_conflict_resolution_write_file_bug(db_session_factory, user_a):
    # Dynamically create vault_files and vault_conflicts tables in the SQLite test DB
    engine = db_session_factory.kw["bind"]
    async with engine.begin() as conn:
        await conn.run_sync(lambda c: SQLModel.metadata.create_all(c, tables=[VaultFile.__table__, VaultConflict.__table__]))

    # 1. Create a dummy VaultFile and VaultConflict in the database
    vault_file = VaultFile(
        user_id=user_a.id,
        path="01-finance/log/2026.md",
        area="finance",
        file_type="note",
        content="App content",
        checksum="123456",
        sync_status="conflict"
    )
    
    async with db_session_factory() as session:
        session.add(vault_file)
        await session.commit()
        await session.refresh(vault_file)
        
        conflict = VaultConflict(
            user_id=user_a.id,
            file_id=vault_file.id,
            app_content="App content",
            vault_content="Vault content"
        )
        session.add(conflict)
        await session.commit()
        await session.refresh(conflict)
        
        conflict_uuid = conflict.id
        
    # 2. Invoke resolve_conflict API endpoint directly
    req = ResolveRequest(resolution=ResolutionState.kept_app)
    
    # Mock settings.vault_path to a temp test directory so write_file can write safely
    settings = get_settings()
    old_vault_path = settings.vault_path
    test_vault_path = "/tmp/vault-adversarial-test-resolve"
    if os.path.exists(test_vault_path):
        shutil.rmtree(test_vault_path)
    os.makedirs(test_vault_path, exist_ok=True)
    settings.vault_path = test_vault_path

    try:
        res = await resolve_conflict(
            conflict_id=conflict_uuid,
            body=req,
            current_user=user_a
        )
        assert res == {"status": "resolved"}
        
        # Verify that the file was written to the temp vault
        written_file = Path(test_vault_path) / "01-finance/log/2026.md"
        assert written_file.exists()
        assert written_file.read_text(encoding="utf-8") == "App content"
    finally:
        # Restore old settings and clean up
        settings.vault_path = old_vault_path
        if os.path.exists(test_vault_path):
            shutil.rmtree(test_vault_path)

    # Clean up DB entries created during test
    async with db_session_factory() as session:
        db_conflict = await session.get(VaultConflict, conflict_uuid)
        if db_conflict:
            await session.delete(db_conflict)
        db_vf = await session.get(VaultFile, vault_file.id)
        if db_vf:
            await session.delete(db_vf)
        await session.commit()


# ── Year rollover ─────────────────────────────────────────────────────────────
# Regression guard for the hardcoded-year bug fixed 2026-08-03. Area logs are
# per-year files whose paths were literals (`01-finance/log/2026.md`), so from
# 2027-01-01 every append would have kept landing in the 2026 file — and would
# NOT have raised, because the stale path was still on the write allowlist.
# These tests fail on the old code and pass on the new, without waiting for
# January.

def test_area_log_path_follows_the_year():
    from datetime import date
    from app.services.chat.tools import area_log_path

    assert area_log_path("finance", date(2026, 12, 31)) == "01-finance/log/2026.md"
    assert area_log_path("finance", date(2027, 1, 1)) == "01-finance/log/2027.md"
    assert area_log_path("health", date(2031, 6, 9)) == "02-health/log/2031.md"
    # The session log is one rolling file, never year-scoped.
    assert area_log_path("session", date(2027, 1, 1)) == "memory/session-log.md"
    # Unknown areas fall back to the session log rather than inventing a folder.
    assert area_log_path("nonsense", date(2027, 1, 1)) == "memory/session-log.md"
    assert area_log_path(None, date(2027, 1, 1)) == "memory/session-log.md"


def test_future_year_logs_are_writable_and_junk_is_not():
    # The whole point: a year nobody hardcoded must still be allowed.
    assert is_append_allowed("01-finance/log/2027.md")
    assert is_append_allowed("03-career/log/2099.md")
    assert is_append_allowed("memory/session-log.md")

    # ...without widening the guard.
    assert not is_append_allowed("01-finance/log/../../../etc/passwd")
    assert not is_append_allowed("01-finance/log/notayear.md")
    assert not is_append_allowed("01-finance/log/20277.md")
    assert not is_append_allowed("06-unknown/log/2027.md")
    assert not is_append_allowed("01-finance/context.md")  # context ≠ append target


def test_guard_actually_writes_a_future_year_file(tmp_path):
    guard = VaultWriteGuard(str(tmp_path))
    guard.append_to_log("02-health/log/2027.md", "Weight: 71.2 kg")
    written = tmp_path / "02-health/log/2027.md"
    assert written.exists()
    assert "Weight: 71.2 kg" in written.read_text()

    with pytest.raises(VaultWriteError):
        guard.append_to_log("06-unknown/log/2027.md", "nope")
