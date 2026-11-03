"""Semantic corpus search behind a shared per-minute budget."""

import time

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from brh_agent.http_support import json_response, query, service

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_REQUESTS = 10


def semantic_search(request: Request) -> Response:
    params = query(request)
    if not params.q.strip():
        raise ValueError("A semantic query is required")
    with request.app.state.semantic_lock:
        budget = request.app.state.semantic_requests
        now = time.monotonic()
        while budget and budget[0] < now - RATE_LIMIT_WINDOW_SECONDS:
            budget.popleft()
        if len(budget) >= RATE_LIMIT_REQUESTS:
            return JSONResponse(
                {
                    "error": {
                        "code": "rate_limited",
                        "message": "Recherche par sens limitée. Réessayez dans une minute.",
                    }
                },
                status_code=429,
                headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
            )
        budget.append(now)
    return json_response(service(request).semantic_corpus(params))
