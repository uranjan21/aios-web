import pytest
import os
import shutil
from pathlib import Path
from uuid import uuid4, UUID
from decimal import Decimal
from sqlmodel import select, SQLModel

from app.core.config import get_settings
from app.services.vault_sync.writer import VaultWriteGuard, VaultWriteError, ALLOWED_WRITE_PATHS, ALLOWED_READ_PATHS
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
        
    # 2. Invoke resolve_conflict API endpoint directly, passing conflict_uuid as a UUID object
    req = ResolveRequest(resolution=ResolutionState.kept_app)
    
    with pytest.raises(AttributeError) as exc_info:
        await resolve_conflict(
            conflict_id=conflict_uuid,  # Pass as UUID object to bypass the SQLite string uuid parser issue
            body=req,
            current_user=user_a
        )
    
    assert "has no attribute 'write_file'" in str(exc_info.value)
    print("\n[BUG CONFIRMED] AttributeError was raised as expected: VaultWriteGuard has no 'write_file' method.")

    # Clean up DB entries created during test
    async with db_session_factory() as session:
        await session.delete(conflict)
        await session.delete(vault_file)
        await session.commit()
