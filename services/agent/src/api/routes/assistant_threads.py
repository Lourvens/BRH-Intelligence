"""Durable conversation index and Agent Server thread restore.

The Agent Server's thread rows live in its in-memory runtime: a restart loses
them while the Postgres checkpointer keeps the conversation state. These routes
own the durable index, and recreate the runtime row (with ``graph_id``) so the
checkpointed history becomes reachable again (ADR-0033).
"""

from __future__ import annotations

import json
import os
import re
from uuid import UUID

import httpx
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from api.context import json_response

OWNER_HEADER = "x-assistant-owner"
_BODY_LIMIT = 8_192
_OWNER = re.compile(r"^[A-Za-z0-9_-]{16,128}$")
_GRAPH_ID = os.environ.get("BRH_ASSISTANT_GRAPH_ID", "agent")
_TIMEOUT = httpx.Timeout(8.0)


def _error(status: int, code: str, message: str) -> JSONResponse:
    response = JSONResponse({"error": {"code": code, "message": message}}, status)
    response.headers["Cache-Control"] = "no-store"
    return response


def _owner(request: Request) -> str | None:
    value = request.headers.get(OWNER_HEADER, "")
    return value if _OWNER.match(value) else None


def _thread_id(request: Request) -> str | None:
    try:
        return str(UUID(request.path_params["thread_id"]))
    except (KeyError, ValueError):
        return None


def _repository(request: Request):
    repository = request.app.state.assistant_threads
    if repository is None:
        raise RuntimeError("Assistant thread storage is unavailable")
    return repository


async def _json(request: Request) -> dict:
    data = await request.body()
    if len(data) > _BODY_LIMIT:
        raise ValueError("Body too large")
    payload = json.loads(data or b"{}")
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object")
    return payload


def _server_url() -> str:
    base = (
        os.environ.get("LANGGRAPH_API_URL")
        or os.environ.get("LANGGRAPH_URL")
        or "http://127.0.0.1:2024"
    )
    return base.rstrip("/")


async def restore_agent_thread(thread_id: str, *, create: bool) -> bool:
    """Make the runtime aware of a checkpointed thread; return reachability.

    ``create`` is the owner path: the registry says this browser owns the
    conversation, so a missing runtime row may be recreated. Without it, only a
    thread the server still knows is accepted — a shared link, never a new row.
    """
    url = f"{_server_url()}/threads/{thread_id}"
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        current = await client.get(url)
        if current.status_code == 200:
            metadata = current.json().get("metadata") or {}
            if metadata.get("graph_id") == _GRAPH_ID:
                return True
            await client.patch(url, json={"metadata": {**metadata, "graph_id": _GRAPH_ID}})
            return True
        if not create:
            return False
        created = await client.post(
            f"{_server_url()}/threads",
            json={
                "thread_id": thread_id,
                "if_exists": "do_nothing",
                "metadata": {"graph_id": _GRAPH_ID},
            },
        )
        created.raise_for_status()
        # An existing row created without metadata still needs the graph id.
        if created.json().get("metadata", {}).get("graph_id") != _GRAPH_ID:
            await client.patch(url, json={"metadata": {"graph_id": _GRAPH_ID}})
        return True


async def list_threads(request: Request) -> Response:
    owner = _owner(request)
    if owner is None:
        return _error(401, "unauthorized", "Accès non autorisé.")
    rows = await run_in_threadpool(_repository(request).list, owner)
    response = json_response({"items": rows})
    response.headers["Cache-Control"] = "no-store"
    return response


async def save_thread(request: Request) -> Response:
    owner = _owner(request)
    thread_id = _thread_id(request)
    if owner is None:
        return _error(401, "unauthorized", "Accès non autorisé.")
    if thread_id is None:
        return _error(400, "invalid_request", "Identifiant de conversation invalide.")
    try:
        payload = await _json(request)
    except ValueError:
        return _error(400, "invalid_request", "Requête invalide.")
    title = payload.get("title")
    if not isinstance(title, str) or not title.strip():
        return _error(400, "invalid_request", "Titre de conversation invalide.")
    row = await run_in_threadpool(_repository(request).upsert, thread_id, owner, title)
    if row is None:
        return _error(403, "forbidden", "Cette conversation appartient à un autre utilisateur.")
    response = json_response(row)
    response.headers["Cache-Control"] = "no-store"
    return response


async def delete_thread(request: Request) -> Response:
    owner = _owner(request)
    thread_id = _thread_id(request)
    if owner is None:
        return _error(401, "unauthorized", "Accès non autorisé.")
    if thread_id is None:
        return _error(400, "invalid_request", "Identifiant de conversation invalide.")
    removed = await run_in_threadpool(_repository(request).delete, thread_id, owner)
    if not removed:
        return _error(404, "not_found", "Conversation introuvable.")
    return Response(status_code=204, headers={"Cache-Control": "no-store"})


async def restore_thread(request: Request) -> Response:
    """Re-attach a conversation to the runtime so its history loads again."""
    owner = _owner(request)
    thread_id = _thread_id(request)
    if owner is None:
        return _error(401, "unauthorized", "Accès non autorisé.")
    if thread_id is None:
        return _error(400, "invalid_request", "Identifiant de conversation invalide.")
    row = await run_in_threadpool(_repository(request).get, thread_id, owner)
    try:
        reachable = await restore_agent_thread(thread_id, create=row is not None)
    except httpx.HTTPError:
        return _error(503, "unavailable", "L’assistant est temporairement indisponible.")
    if not reachable:
        return _error(404, "not_found", "Conversation introuvable.")
    response = json_response(row or {"thread_id": thread_id, "title": None})
    response.headers["Cache-Control"] = "no-store"
    return response
