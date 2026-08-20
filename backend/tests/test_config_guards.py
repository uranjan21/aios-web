"""Production startup guards in `app.core.config.Settings`.

These are the checks that stop a misconfigured production deploy from booting.
Each one is only worth having if it actually refuses, so every guard here is
asserted in both directions: it fires on the bad config AND stays out of the way
on the good one.
"""
import pytest

from app.core.config import Settings

# A production config that passes every guard. Individual tests break one field.
GOOD = dict(
    environment="production",
    app_secret_key="x" * 40,
    app_password="not-a-default-password",
    redis_url="redis://localhost:6379/0",
    resend_api_key="re_test_key",
    allowed_origin="https://app.example.com",
)


def _settings(**overrides) -> Settings:
    return Settings(**{**GOOD, **overrides})


def test_good_production_config_boots():
    s = _settings()
    assert s.environment == "production"
    assert s.allowed_origin.startswith("https://")


# ── cleartext http ────────────────────────────────────────────────────────────

def test_production_refuses_non_https_origin():
    """A non-https origin means the auth cookie loses `Secure` and every JWT
    crosses the network in the clear. That must not be reachable by default."""
    with pytest.raises(ValueError, match="cleartext"):
        _settings(allowed_origin="http://200.141.5.90")


def test_insecure_http_is_allowed_only_when_acknowledged():
    s = _settings(allowed_origin="http://200.141.5.90", allow_insecure_http=True)
    assert s.allow_insecure_http is True
    assert not s.allowed_origin.startswith("https://")


def test_ack_does_not_leak_into_development():
    """Dev is http by default and must stay bootable without the ack flag."""
    s = Settings(environment="development", allowed_origin="http://localhost:5173")
    assert s.allow_insecure_http is False


# ── the other production guards ───────────────────────────────────────────────

@pytest.mark.parametrize("secret", ["change-me-in-production", "changeme", "secret", "", "short"])
def test_production_refuses_weak_secret_key(secret):
    with pytest.raises(ValueError, match="APP_SECRET_KEY"):
        _settings(app_secret_key=secret)


def test_production_refuses_unset_secret_key(monkeypatch):
    """The default must be a fixed literal that this guard catches, not a
    per-process random value. A generated default is >32 chars and not in
    `_INSECURE_DEFAULTS`, so it passes both checks — and then each gunicorn
    worker signs JWTs with a different key (no --preload), 401ing roughly half
    of all authenticated requests with nothing in the logs."""
    monkeypatch.delenv("APP_SECRET_KEY", raising=False)
    unset = {k: v for k, v in GOOD.items() if k != "app_secret_key"}
    with pytest.raises(ValueError, match="APP_SECRET_KEY"):
        Settings(**unset, _env_file=None)


def test_default_secret_key_is_stable_across_instances(monkeypatch):
    """Two Settings built the same way must agree on the signing key — a
    `default_factory` would give them different ones, which is what B1 was."""
    monkeypatch.delenv("APP_SECRET_KEY", raising=False)
    a = Settings(environment="development", _env_file=None)
    b = Settings(environment="development", _env_file=None)
    assert a.app_secret_key == b.app_secret_key


def test_production_refuses_default_app_password():
    with pytest.raises(ValueError, match="APP_PASSWORD"):
        _settings(app_password="demo1234")


def test_production_requires_redis_for_shared_rate_limiting():
    with pytest.raises(ValueError, match="REDIS_URL"):
        _settings(redis_url="")


def test_production_requires_email_provider():
    with pytest.raises(ValueError, match="RESEND_API_KEY"):
        _settings(resend_api_key="")


def test_production_refuses_localhost_origin():
    with pytest.raises(ValueError, match="localhost"):
        _settings(allowed_origin="http://localhost:5173", allow_insecure_http=True)


def test_production_refuses_stripe_test_key():
    with pytest.raises(ValueError, match="sk_live_"):
        _settings(stripe_secret_key="sk_test_abc123")


def test_token_encryption_key_required_when_google_oauth_configured():
    """An empty Fernet key raises InvalidToken on the first OAuth token save,
    long after the deploy looked successful."""
    with pytest.raises(ValueError, match="TOKEN_ENCRYPTION_KEY"):
        _settings(gcal_client_id="client-id.apps.googleusercontent.com", token_encryption_key="")
