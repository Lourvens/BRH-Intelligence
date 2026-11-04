"""Bearer-protected feedback intake and administrative operational endpoints."""

import hmac
import json
import logging
import re
from uuid import UUID

import httpx
import psycopg
from brh_core.operations.feedback import FeedbackLimitError
from brh_core.operations.models import FeedbackStatus, FeedbackSubmission, FeedbackUpdate
from pydantic import BaseModel, ConfigDict, Field
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse

from brh_agent.api.responses import json_response

logger = logging.getLogger(__name__)
_MAX_BODY_BYTES = 32000
_IDENTITY = re.compile(r"^[a-f0-9]{64}$")


class FeedbackQuery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: FeedbackStatus | None = None
    page: int = Field(default=1, ge=1, le=1000000)


def _error(status: int, code: str, message: str, **kwargs) -> JSONResponse:
    return JSONResponse({"error": {"code": code, "message": message}}, status, **kwargs)


def _authorize(request: Request) -> JSONResponse | None:
    token = request.app.state.operations_settings.admin_api_token.get_secret_value()
    provided = request.headers.get("authorization", "")
    if not token or not hmac.compare_digest(provided.encode(), f"Bearer {token}".encode()):
        return _error(401, "unauthorized", "Accès non autorisé.")
    return None


def _repository(request: Request):
    repository = request.app.state.operations
    if repository is None:
        raise RuntimeError("Operations storage is unavailable")
    return repository


async def _body(request: Request) -> dict:
    data = bytearray()
    async for chunk in request.stream():
        data.extend(chunk)
        if len(data) > _MAX_BODY_BYTES:
            raise ValueError("Request body too large")
    value = json.loads(data)
    if not isinstance(value, dict):
        raise ValueError("Expected JSON object")
    return value


async def submit_feedback(request: Request) -> JSONResponse:
    if denied := _authorize(request):
        return denied
    identity = request.headers.get("x-brh-feedback-identity", "")
    if not _IDENTITY.fullmatch(identity):
        return _error(400, "invalid_request", "Identité de soumission invalide.")
    submission = FeedbackSubmission.model_validate(await _body(request))
    try:
        item = await run_in_threadpool(_repository(request).submit, submission, identity)
    except FeedbackLimitError as exc:
        return _error(
            429,
            "rate_limited",
            "Trop de retours envoyés. Réessayez plus tard.",
            headers={"Retry-After": str(exc.retry_after)},
        )
    # Intake acknowledges receipt without exposing review fields or stored content.
    response = json_response({"id": item["id"], "status": item["status"]})
    response.status_code = 201
    response.headers["Cache-Control"] = "no-store"
    return response


async def list_feedback(request: Request) -> JSONResponse:
    if denied := _authorize(request):
        return denied
    query = FeedbackQuery.model_validate(dict(request.query_params))
    result = await run_in_threadpool(_repository(request).list_feedback, query.status, query.page)
    response = json_response(result)
    response.headers["Cache-Control"] = "no-store"
    return response


async def update_feedback(request: Request) -> JSONResponse:
    if denied := _authorize(request):
        return denied
    identifier = str(UUID(request.path_params["identifier"]))
    update = FeedbackUpdate.model_validate(await _body(request))
    item = await run_in_threadpool(_repository(request).update, identifier, update)
    if item is None:
        return _error(404, "not_found", "Retour introuvable.")
    response = json_response(item)
    response.headers["Cache-Control"] = "no-store"
    return response


def _corpus_snapshot(retrieval, method: str):
    if retrieval is None:
        return None
    try:
        return getattr(retrieval, method)()
    except (psycopg.Error, httpx.HTTPError, RuntimeError, FileNotFoundError):
        logger.warning("Admin corpus snapshot unavailable: %s", method, exc_info=True)
        return None


async def overview(request: Request) -> JSONResponse:
    if denied := _authorize(request):
        return denied
    result = await run_in_threadpool(_repository(request).overview)
    result["corpus"] = await run_in_threadpool(
        _corpus_snapshot, request.app.state.retrieval, "corpus_stats"
    )
    result["readiness"] = await run_in_threadpool(
        _corpus_snapshot, request.app.state.retrieval, "corpus_readiness"
    )
    settings = request.app.state.operations_settings
    result["configuration"] = {
        "daily_token_limit": settings.agent_daily_token_limit,
        "rate_limit_enabled": settings.rate_limit_enabled,
    }
    response = json_response(result)
    response.headers["Cache-Control"] = "no-store"
    return response
