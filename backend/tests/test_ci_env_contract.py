"""The CI workflow must not override the environment conftest.py sets up.

conftest.py configures the whole suite with `os.environ.setdefault`, which means
any variable the workflow exports silently WINS over the value the tests need.
That is how CI stayed red on every run for months: TOKEN_ENCRYPTION_KEY was set
to a string that is valid base64 but decodes to 39 bytes, and Fernet requires
exactly 32 — so the cipher raised and every BYOK, agent and write-tool test died
with it. VAULT_PATH had the same shape of problem, pointing the vault tests at a
directory nothing wrote to.

Nothing caught it because nothing was looking. This looks.
"""
import base64
import re
from pathlib import Path

import pytest
import yaml
from cryptography.fernet import Fernet

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFTEST = Path(__file__).parent / "conftest.py"
WORKFLOW = REPO_ROOT / ".github" / "workflows" / "ci.yml"

pytestmark = pytest.mark.skipif(
    not WORKFLOW.is_file(), reason="workflow not present (installed package, not a checkout)"
)


def _setdefault_names() -> set[str]:
    """Every variable conftest.py claims with os.environ.setdefault."""
    source = CONFTEST.read_text()
    return set(re.findall(r'os\.environ\.setdefault\(\s*"([A-Z0-9_]+)"', source))


def _backend_job_env() -> dict:
    workflow = yaml.safe_load(WORKFLOW.read_text())
    return workflow["jobs"]["backend"].get("env") or {}


def test_conftest_actually_claims_the_suite_environment():
    # If this shrinks, the assertions below stop protecting anything.
    claimed = _setdefault_names()
    assert {"TOKEN_ENCRYPTION_KEY", "VAULT_PATH", "APP_PASSWORD", "DATABASE_URL"} <= claimed


def test_ci_does_not_override_anything_conftest_sets():
    overridden = sorted(_setdefault_names() & set(_backend_job_env()))
    assert not overridden, (
        "The CI backend job sets "
        + ", ".join(overridden)
        + ", which overrides conftest.py's setdefault and silently replaces the "
        "value the tests need. Remove it from .github/workflows/ci.yml."
    )


def test_the_encryption_key_conftest_uses_is_a_real_fernet_key():
    """A key can be valid base64 and still not be a Fernet key.

    This is the specific mistake that broke CI: base64 that decodes to the wrong
    number of bytes passes every eyeball check and fails at cipher construction.
    """
    match = re.search(
        r'os\.environ\.setdefault\(\s*"TOKEN_ENCRYPTION_KEY",\s*"([^"]+)"', CONFTEST.read_text()
    )
    assert match, "conftest.py no longer sets TOKEN_ENCRYPTION_KEY"
    key = match.group(1)

    assert len(base64.urlsafe_b64decode(key)) == 32, "Fernet requires exactly 32 decoded bytes"
    Fernet(key.encode())  # raises if the key is unusable
