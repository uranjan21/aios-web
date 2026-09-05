"""Interactive API docs must not be public on a production deployment.

/docs, /redoc and /openapi.json publish every route, schema and parameter to
anyone who asks. That is a development convenience, not something to hand
someone probing a public deployment.
"""
import importlib

import pytest

import app.core.config as config_module

PROD_ENV = {
    "ENVIRONMENT": "production",
    "APP_SECRET_KEY": "x" * 40,
    "APP_PASSWORD": "not-a-default-password",
    "REDIS_URL": "redis://localhost:6379/0",
    "RESEND_API_KEY": "re_placeholder",
    "ALLOWED_ORIGIN": "https://app.example.com",
    "TOKEN_ENCRYPTION_KEY": "dGVzdC1rZXktZm9yLWNpLW9ubHktZG8tbm90LXVzZS1pbi1wcm9k",
}


@pytest.fixture
def build_app(monkeypatch):
    def _build(**env):
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        config_module.get_settings.cache_clear()
        main = importlib.import_module("app.main")
        return main.create_app()

    yield _build
    # Leave the cached settings matching the restored test environment, or every
    # later test in the session builds against production config.
    config_module.get_settings.cache_clear()


def _doc_urls(app):
    return (app.docs_url, app.redoc_url, app.openapi_url)


def test_docs_are_served_in_development(build_app):
    app = build_app(ENVIRONMENT="development")
    assert all(_doc_urls(app)), "developers should keep /docs"


def test_docs_are_not_served_in_production(build_app):
    app = build_app(**PROD_ENV, ENABLE_API_DOCS="false")
    assert _doc_urls(app) == (None, None, None)

    # And no route answers those paths either — a None url must not leave a
    # handler mounted under a different name.
    paths = {getattr(r, "path", None) for r in app.routes}
    assert not ({"/docs", "/redoc", "/openapi.json"} & paths)


def test_production_can_opt_back_in(build_app):
    app = build_app(**PROD_ENV, ENABLE_API_DOCS="true")
    assert all(_doc_urls(app)), "a staging environment should be able to opt in"
