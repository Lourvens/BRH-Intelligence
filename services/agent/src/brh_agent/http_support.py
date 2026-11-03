"""Shared parsing, serialization and failure handling for corpus HTTP routes."""

import logging
from typing import Any

from brh_core.corpus.models import CorpusQuery
from brh_core.corpus.service import StaleArtifactError
from pydantic import TypeAdapter, ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


def json_response(value: Any) -> JSONResponse:
    return JSONResponse(TypeAdapter(object).dump_python(value, mode="json"))


def service(request: Request) -> Any:
    return request.app.state.retrieval


def query(request: Request) -> CorpusQuery:
    parameters = dict(request.query_params)
    parameters.pop("hops", None)
    return CorpusQuery.model_validate(parameters)


async def failure(request: Request, exc: Exception) -> JSONResponse:
    if isinstance(exc, FileNotFoundError):
        status, code, message = 404, "not_found", "Document ou ressource introuvable."
    elif isinstance(exc, StaleArtifactError):
        status, code, message = 409, "artifact_changed", "Le document est en cours de mise à jour."
    elif isinstance(exc, (ValidationError, ValueError, IndexError)):
        status, code, message = 400, "invalid_request", "Paramètres ou numéro de page invalides."
    else:
        logger.error("Corpus request unavailable: %s (%s)", type(exc).__name__, request.url.path)
        status, code, message = 503, "unavailable", "Le corpus est temporairement indisponible."
    return JSONResponse({"error": {"code": code, "message": message}}, status_code=status)
