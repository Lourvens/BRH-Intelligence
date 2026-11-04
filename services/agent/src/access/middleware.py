"""Rate-limit admission, daily quota gate and CORS for the Agent Server."""

from __future__ import annotations

import logging
import time

from starlette.concurrency import run_in_threadpool
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.cors import CORSMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from access.identity import request_identity
from access.limiter import (
    DAY_SECONDS,
    RATE_LIMIT_MESSAGES,
    RATE_LIMIT_PRIORITY,
    RUN_CREATION,
    SlidingWindowLimiter,
    limit_checks,
)
from usage.quota import DailyTokenQuota, QuotaDecision

logger = logging.getLogger(__name__)


def _quota_response(decision: QuotaDecision) -> JSONResponse:
    headers = {
        "X-RateLimit-Limit": str(decision.limit),
        "X-RateLimit-Remaining": str(decision.remaining),
        "X-RateLimit-Reset": str(int(time.time()) + decision.retry_after),
        "X-RateLimit-Subcode": "daily_token_limit",
        "Retry-After": str(decision.retry_after),
    }
    return JSONResponse(
        {
            "error": {
                "code": "rate_limited",
                "subcode": "daily_token_limit",
                "message": RATE_LIMIT_MESSAGES["daily_token_limit"],
                "limit": decision.limit,
                "remaining": decision.remaining,
                "used": decision.used,
                "retry_after": decision.retry_after,
                "window_seconds": DAY_SECONDS,
            }
        },
        status_code=429,
        headers=headers,
    )


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, settings, quota: DailyTokenQuota | None = None):
        super().__init__(app)
        self.settings = settings
        self.limiter = SlidingWindowLimiter()
        self.quota = quota or DailyTokenQuota(settings)

    async def dispatch(self, request: Request, call_next):
        if not self.settings.rate_limit_enabled:
            return await call_next(request)

        checks = limit_checks(request.url.path, request.method, self.settings)
        if not checks:
            return await call_next(request)

        identity = request_identity(
            request,
            self.settings.rate_limit_trust_proxy,
            self.settings.quota_identity_salt.get_secret_value(),
        )
        decisions = [
            self.limiter.check(
                name if name == "global" else f"{name}:{identity}",
                limit,
                self.settings.rate_limit_window_seconds,
            )
            for name, limit in checks
        ]
        denied = [
            (name, decision)
            for (name, _), decision in zip(checks, decisions, strict=False)
            if not decision.allowed
        ]
        if denied:
            primary_name, primary = next(
                (name, decision)
                for name in RATE_LIMIT_PRIORITY
                for name_candidate, decision in denied
                if name_candidate == name
            )
            headers = {
                "X-RateLimit-Limit": str(primary.limit),
                "X-RateLimit-Remaining": str(primary.remaining),
                "X-RateLimit-Reset": str(int(time.time()) + primary.reset_seconds),
                "X-RateLimit-Subcode": primary_name,
                "Retry-After": str(primary.reset_seconds),
            }
            return JSONResponse(
                {
                    "error": {
                        "code": "rate_limited",
                        "subcode": primary_name,
                        "message": RATE_LIMIT_MESSAGES[primary_name],
                        "limit": primary.limit,
                        "remaining": primary.remaining,
                        "retry_after": primary.reset_seconds,
                        "window_seconds": self.settings.rate_limit_window_seconds,
                    }
                },
                status_code=429,
                headers=headers,
            )

        daily_check = (
            request.method == "POST"
            and RUN_CREATION.match(request.url.path)
            and self.quota.enabled
        )
        if daily_check:
            try:
                quota_decision = await run_in_threadpool(self.quota.check, identity)
            except Exception:
                logger.exception("Daily assistant quota could not be checked")
            else:
                if not quota_decision.allowed:
                    return _quota_response(quota_decision)

        tightest = min(decisions, key=lambda decision: decision.remaining)
        headers = {
            "X-RateLimit-Limit": str(tightest.limit),
            "X-RateLimit-Remaining": str(tightest.remaining),
            "X-RateLimit-Reset": str(int(time.time()) + tightest.reset_seconds),
        }
        response = await call_next(request)
        response.headers.update(headers)
        return response


def install_security(app, settings, quota: DailyTokenQuota | None = None) -> None:
    """Install CORS outside the limiter so 429 responses still get CORS headers."""
    app.add_middleware(RateLimitMiddleware, settings=settings, quota=quota)
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
                "x-ratelimit-subcode",
            ],
            max_age=600,
        )
