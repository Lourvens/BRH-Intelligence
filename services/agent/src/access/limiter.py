"""Path-scoped request budgets and the sliding window that enforces them."""

from __future__ import annotations

import math
import re
import time
from collections import deque
from dataclasses import dataclass
from threading import Lock

DAY_SECONDS = 86400

RUN_CREATION = re.compile(r"^/(?:threads/[^/]+/)?runs(?:/(?:stream|wait))?/?$")
AGENT_PREFIXES = ("/threads", "/runs", "/assistants", "/store")
HEALTH_PATHS = {"/ok", "/health", "/info", "/metrics", "/docs", "/openapi.json"}

# Keep these values stable: the assistant maps each one to its own copy and CTA.
RATE_LIMIT_PRIORITY = ("global", "agent_run", "agent", "search", "corpus")
RATE_LIMIT_MESSAGES = {
    "global": "Le service reçoit trop de demandes en ce moment. Réessayez dans quelques instants.",
    "agent_run": (
        "Vous avez posé trop de questions en peu de temps. Réessayez dans quelques instants."
    ),
    "agent": "Cette session a envoyé trop de requêtes. Réessayez dans quelques instants.",
    "search": "La recherche sémantique reçoit trop de demandes. Réessayez dans quelques instants.",
    "corpus": "Le corpus reçoit trop de demandes en ce moment. Réessayez dans quelques instants.",
    "daily_token_limit": (
        "Votre quota quotidien d’utilisation de l’assistant est atteint. "
        "Il se réinitialise à minuit UTC."
    ),
}


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


def limit_checks(path: str, method: str, settings) -> list[tuple[str, int]]:
    """Return the named budgets a request must pass, tightest last."""
    if path in HEALTH_PATHS or method == "OPTIONS":
        return []
    checks = [("global", settings.rate_limit_global_requests)]
    if path.startswith("/corpus/v1/search"):
        checks.append(("search", settings.rate_limit_search_requests))
    elif path.startswith("/corpus/v1"):
        checks.append(("corpus", settings.rate_limit_corpus_requests))
    elif path.startswith(AGENT_PREFIXES):
        checks.append(("agent", settings.rate_limit_agent_requests))
        if method == "POST" and RUN_CREATION.match(path):
            checks.append(("agent_run", settings.rate_limit_agent_runs))
    else:
        return []
    return checks
