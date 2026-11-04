"""Semantic corpus search; request limits live in the app middleware."""

from starlette.requests import Request
from starlette.responses import Response

from brh_agent.api.responses import json_response, query, service


def semantic_search(request: Request) -> Response:
    params = query(request)
    if not params.q.strip():
        raise ValueError("A semantic query is required")
    return json_response(service(request).semantic_corpus(params))
