"""Request limits and CORS for the Agent Server and corpus routes."""

from __future__ import annotations

import math
import re
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

_RUN_CREATION = re.compile(r"^/(?:threads/[^/]+/)?runs(?:/(?:stream|wait))?/?$")
_AGENT_PREFIXES = ("/threads", "/runs", "/assistants", "/store")
_HEALTH_PATHS = {"/ok", "/health", "/info", "/metrics", "/docs", "/openapi.json"}


@dataclass(frozen=True)
class LimitDecision:
    allowed: bool
    limit: int
    remaining: int
    reset_seconds: int


class SlidingWindowLimiter:
    """Small in-process limiter; the service runs in one Modal container."""

    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def check(self, key: str, limit: int, window: float, now: float | None = None) -> LimitDecision:
        now = time.monotonic() if now is None else now
        with self._lock:
            events = self._events.setdefault(key, deque())
            cutoff = now - window
            while events and events[0] <= cutoff:
                events.popleft()
            if len(events) >= limit:
                reset = max(1, math.ceil(events[0] + window - now))
                return LimitDecision(False, limit, 0, reset)
            events.append(now)
            remaining = limit - len(events)
            reset = max(1, math.ceil(events[0] + window - now))
            return LimitDecision(True, limit, remaining, reset)


def client_identity(request: Request, trust_proxy: bool) -> str:
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        if forwarded:
            # The proxy appends the address it saw; the right-most hop is
            # therefore the one we can trust, not a client-supplied prefix.
            return forwarded.rsplit(",", 1)[-1].strip()
    return request.client.host if request.client else "unknown"


def _limit_for_path(path: str, method: str, settings) -> list[tuple[str, int]]:
    if path in _HEALTH_PATHS or method == "OPTIONS":
        return []
    checks = [("global", settings.rate_limit_global_requests)]
    if path.startswith("/corpus/v1/search"):
        checks.append(("search", settings.rate_limit_search_requests))
    elif path.startswith("/corpus/v1"):
        checks.append(("corpus", settings.rate_limit_corpus_requests))
    elif path.startswith(_AGENT_PREFIXES):
        checks.append(("agent", settings.rate_limit_agent_requests))
        if method == "POST" and _RUN_CREATION.match(path):
            checks.append(("agent-run", settings.rate_limit_agent_runs))
    else:
        return []
    return checks


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings):
        super().__init__(app)
        self.settings = settings
        self.limiter = SlidingWindowLimiter()

    async def dispatch(self, request: Request, call_next):
        if not self.settings.rate_limit_enabled:
            return await call_next(request)

        checks = _limit_for_path(request.url.path, request.method, self.settings)
        if not checks:
            return await call_next(request)

        identity = client_identity(request, self.settings.rate_limit_trust_proxy)
        decisions = [
            self.limiter.check(
                name if name == "global" else f"{name}:{identity}",
                limit,
                self.settings.rate_limit_window_seconds,
            )
            for name, limit in checks
        ]
        tightest = min(decisions, key=lambda decision: decision.remaining)
        headers = {
            "X-RateLimit-Limit": str(tightest.limit),
            "X-RateLimit-Remaining": str(tightest.remaining),
            "X-RateLimit-Reset": str(int(time.time()) + tightest.reset_seconds),
        }
        if not all(decision.allowed for decision in decisions):
            headers["Retry-After"] = str(tightest.reset_seconds)
            return JSONResponse(
                {
                    "error": {
                        "code": "rate_limited",
                        "message": "Limite de requêtes atteinte. Réessayez plus tard.",
                    }
                },
                status_code=429,
                headers=headers,
            )
        response = await call_next(request)
        response.headers.update(headers)
        return response


def install_security(app, settings) -> None:
    """Install CORS outside the limiter so 429 responses still get CORS headers."""
    app.add_middleware(RateLimitMiddleware, settings=settings)
    origins = settings.cors_allowed_origins_list
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            allow_headers=["*"],
            expose_headers=[
                "content-location",
                "x-pagination-total",
                "x-ratelimit-limit",
                "x-ratelimit-remaining",
                "x-ratelimit-reset",
            ],
            max_age=600,
        )
