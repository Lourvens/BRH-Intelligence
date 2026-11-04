"""Request limits and CORS are configured independently of route logic."""

from brh_agent.middleware.security import SlidingWindowLimiter, install_security
from brh_core.config import Settings
from starlette.applications import Starlette
from starlette.responses import JSONResponse
from starlette.routing import Route
from starlette.testclient import TestClient


def _settings(**overrides):
    values = {
        "rate_limit_enabled": True,
        "rate_limit_window_seconds": 60,
        "rate_limit_agent_requests": 5,
        "rate_limit_agent_runs": 1,
        "rate_limit_corpus_requests": 5,
        "rate_limit_search_requests": 2,
        "cors_allowed_origins": "https://brh-intelligence.vercel.app",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def _app(settings):
    async def run(request):
        return JSONResponse({"ok": True})

    async def health(request):
        return JSONResponse({"ok": True})

    app = Starlette(
        routes=[
            Route("/runs", run, methods=["POST"]),
            Route("/ok", health),
        ]
    )
    install_security(app, settings)
    return app


def test_sliding_window_allows_then_denies():
    limiter = SlidingWindowLimiter()
    assert limiter.check("ip", 2, 60, now=0).allowed is True
    assert limiter.check("ip", 2, 60, now=1).allowed is True
    denied = limiter.check("ip", 2, 60, now=2)
    assert denied.allowed is False
    assert denied.remaining == 0
    assert denied.reset_seconds == 58
    assert limiter.check("ip", 2, 60, now=61).allowed is True


def test_agent_runs_have_a_separate_tight_limit():
    client = TestClient(_app(_settings()))
    assert client.post("/runs").status_code == 200
    response = client.post("/runs")
    assert response.status_code == 429
    assert response.json()["error"]["code"] == "rate_limited"
    assert "retry-after" in response.headers


def test_cors_allows_only_the_configured_frontend():
    client = TestClient(_app(_settings()))
    allowed = client.options(
        "/runs",
        headers={
            "Origin": "https://brh-intelligence.vercel.app",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://brh-intelligence.vercel.app"

    denied = client.options(
        "/runs",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert "access-control-allow-origin" not in denied.headers


def test_health_is_exempt_from_request_limits():
    client = TestClient(_app(_settings(rate_limit_agent_requests=1)))
    assert client.get("/ok").status_code == 200
    assert client.get("/ok").status_code == 200


def test_global_limit_is_shared_across_identities():
    client = TestClient(_app(_settings(rate_limit_global_requests=1)))
    assert client.post("/runs").status_code == 200
    response = client.post("/runs", headers={"X-Forwarded-For": "203.0.113.9"})
    assert response.status_code == 429
