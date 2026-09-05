"""The API process serves the SPA, so these guard the single-origin topology.

Every case here is something that silently breaks a deploy: an API route
swallowed by the static mount, a hard 404 on browser refresh, a stale bundle
pinned by a cached index.html, or a missing font host in the CSP.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core.spa import mount_spa


@pytest.fixture
def dist(tmp_path):
    (tmp_path / "assets").mkdir()
    (tmp_path / "index.html").write_text("<!doctype html><title>shell</title>")
    (tmp_path / "assets" / "index-abc123.js").write_text("console.log(1)")
    (tmp_path / "favicon.svg").write_text("<svg/>")
    return tmp_path


@pytest.fixture
def client(dist):
    app = FastAPI()

    @app.get("/api/thing")
    async def thing():
        return {"ok": True}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    mount_spa(app, str(dist))
    return TestClient(app)


def test_api_routes_are_not_swallowed_by_the_static_mount(client):
    assert client.get("/api/thing").json() == {"ok": True}
    assert client.get("/health").json() == {"status": "ok"}


def test_client_route_falls_back_to_the_shell(client):
    # Refreshing /app/finance must return the SPA, not a 404 — the server has
    # no such file; React Router resolves it in the browser.
    resp = client.get("/app/finance")
    assert resp.status_code == 200
    assert "shell" in resp.text


def test_nested_client_route_falls_back_too(client):
    assert client.get("/app/workspace/goals").status_code == 200


@pytest.mark.parametrize("method", ["get", "post", "put", "patch", "delete"])
@pytest.mark.parametrize("path", ["/api/nope", "/api/areas/gone", "/ws/nope", "/api", "/ws"])
def test_unknown_api_paths_404_instead_of_returning_the_shell(client, method, path):
    """The shell must never answer for an API path.

    A removed or mistyped endpoint that replies `200 text/html` makes the
    frontend's JSON parse blow up somewhere far from the cause, and hides a
    routing regression behind a page that renders perfectly well.
    """
    resp = getattr(client, method)(path)
    assert resp.status_code == 404, f"{method.upper()} {path} -> {resp.status_code}"
    assert "text/html" not in resp.headers.get("content-type", "")


def test_health_is_not_shadowed_when_the_route_is_absent(client):
    # /health belongs to the API surface even if a build forgot to define it —
    # answering with the shell would make an uptime monitor report "healthy".
    assert "text/html" not in client.get("/health").headers.get("content-type", "")


def test_a_missing_asset_is_a_real_404_not_the_shell(client):
    # Returning HTML for a missing .js hands the browser a document where it
    # expects a module; the console error then points nowhere near the cause.
    assert client.get("/assets/index-deleted.js").status_code == 404


def test_hashed_assets_are_cached_immutably(client):
    resp = client.get("/assets/index-abc123.js")
    assert resp.status_code == 200
    assert "immutable" in resp.headers["cache-control"]


def test_the_shell_is_never_cached(client):
    # A cached index.html pins clients to asset hashes a deploy has removed.
    for path in ("/", "/app/finance"):
        assert "no-cache" in client.get(path).headers["cache-control"], path


def test_missing_bundle_leaves_the_api_alone(tmp_path):
    # Local dev: Vite serves the frontend, this process serves only the API.
    app = FastAPI()

    @app.get("/api/thing")
    async def thing():
        return {"ok": True}

    assert mount_spa(app, str(tmp_path / "nope")) is False
    assert TestClient(app).get("/api/thing").json() == {"ok": True}


def test_csp_allows_the_fonts_the_shell_actually_loads():
    # index.html links fonts.googleapis.com and the files come from
    # fonts.gstatic.com. Drop either and the type system falls back to system
    # UI app-wide, which reads as a design regression rather than a CSP error.
    from app.core.middleware import _build_csp

    csp = _build_csp("https://app.example.com")
    assert "https://fonts.googleapis.com" in csp
    assert "https://fonts.gstatic.com" in csp


def test_csp_does_not_allow_inline_script():
    from app.core.middleware import _build_csp

    csp = _build_csp("https://app.example.com")
    script_src = next(d for d in csp.split(";") if d.strip().startswith("script-src"))
    assert "unsafe-inline" not in script_src


def test_csp_forbids_framing():
    from app.core.middleware import _build_csp

    assert "frame-ancestors 'none'" in _build_csp("https://app.example.com")
