"""Map corpus failures onto the stable JSON error envelope."""

import logging

import httpx
import psycopg
from brh_core.corpus.service import StaleArtifactError
from pydantic import ValidationError
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


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


# Starlette routes these exception types through failure(); anything else is a 500.
EXCEPTION_HANDLERS = {
    FileNotFoundError: failure,
    ValidationError: failure,
    ValueError: failure,
    IndexError: failure,
    StaleArtifactError: failure,
    psycopg.Error: failure,
    httpx.HTTPError: failure,
    RuntimeError: failure,
}
