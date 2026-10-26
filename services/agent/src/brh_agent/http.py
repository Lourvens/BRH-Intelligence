"""Thin research read routes mounted in the existing Agent Server."""

import logging
import threading
import time
from collections import deque
from contextlib import asynccontextmanager
from urllib.parse import quote
from uuid import UUID

import httpx
import psycopg
from brh_core.corpus.download import markdown_export
from brh_core.corpus.models import CorpusQuery
from brh_core.corpus.service import StaleArtifactError
from brh_core.corpus.storage import digest
from brh_core.retrieval import build_retrieval_service
from pydantic import TypeAdapter, ValidationError
from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

logger = logging.getLogger(__name__)


def json_response(value):
    from pydantic import TypeAdapter

    return JSONResponse(TypeAdapter(object).dump_python(value, mode="json"))


def service(request: Request):
    return request.app.state.retrieval


def query(request: Request):
    parameters = dict(request.query_params)
    parameters.pop("hops", None)
    return CorpusQuery.model_validate(parameters)


def documents(request: Request):
    return json_response(service(request).browse_corpus(query(request)))


def semantic_search(request: Request):
    params = query(request)
    if not params.q.strip():
        raise ValueError("A semantic query is required")
    with request.app.state.semantic_lock:
        budget = request.app.state.semantic_requests
        now = time.monotonic()
        while budget and budget[0] < now - 60:
            budget.popleft()
        if len(budget) >= 10:
            return JSONResponse(
                {
                    "error": {
                        "code": "rate_limited",
                        "message": "Recherche par sens limitée. Réessayez dans une minute.",
                    }
                },
                status_code=429,
                headers={"Retry-After": "60"},
            )
        budget.append(now)
    return json_response(service(request).semantic_corpus(params))


def facets(request: Request):
    return json_response(service(request).corpus_facets(query(request)))


def stats(request: Request):
    return json_response(service(request).corpus_stats())


def document(request: Request):
    return json_response(service(request).corpus_document(request.path_params["slug"]))


def page(request: Request):
    return json_response(
        service(request).corpus_page(
            request.path_params["slug"], int(request.path_params["number"])
        )
    )


def reader(request: Request):
    content = service(request).corpus_reader(
        request.path_params["slug"], int(request.path_params["number"])
    )
    # The page and reader metadata originate in one database snapshot.
    return json_response(content)


def asset(request: Request):
    publication_id = request.path_params.get("publication_id")
    data, entry, _ = service(request).corpus_asset(
        request.path_params["slug"], request.path_params["name"], publication_id
    )
    headers = {
        "X-Content-Type-Options": "nosniff",
        "ETag": f'"{entry["sha256"]}"',
        "Cache-Control": "public, max-age=31536000, immutable" if publication_id else "no-cache",
    }
    if request.headers.get("if-none-match") == headers["ETag"]:
        return Response(status_code=304, headers=headers)
    return Response(data, media_type=entry["content_type"], headers=headers)


def markdown_download(request: Request):
    publication_id = request.path_params.get("publication_id")
    data, _entry, publication = service(request).corpus_markdown(
        request.path_params["slug"], publication_id
    )
    filename = quote(publication["slug"], safe="") + ".md"
    data = markdown_export(data, publication)
    return Response(
        data,
        media_type="text/markdown; charset=utf-8",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "no-cache",
            "ETag": f'"{digest(data)}"',
            "X-BRH-Source-SHA256": publication["sha256"],
            "X-BRH-Markdown-SHA256": publication["artifact_hash"],
            "X-BRH-Published-At": publication["published_at"].isoformat(),
            "X-BRH-Title": quote(publication["title"], safe=""),
        },
    )


def readiness(request: Request):
    result = service(request).corpus_readiness()
    return JSONResponse(
        TypeAdapter(object).dump_python(result, mode="json"),
        status_code=200 if result["ready"] else 503,
    )


def entities(request: Request):
    params = query(request)
    return json_response(
        {
            "items": service(request).corpus_entities(
                params.q,
                kind=params.kind,
                limit=params.page_size,
                document_id=params.document_id,
                family=params.family,
                year=params.year,
            )
        }
    )


def entity(request: Request):
    identifier = str(UUID(request.path_params["entity_id"]))
    found = service(request).corpus_entities(entity_ids=[identifier], limit=1)
    if not found:
        raise FileNotFoundError(identifier)
    return json_response(
        {"entity": found[0], "passages": service(request).corpus_passages(identifier)}
    )


def graph_arguments(request):
    params = query(request)
    hops = int(request.query_params.get("hops", "1"))
    if not 1 <= hops <= 2:
        raise ValueError("Graph depth must be 1 or 2")
    return {
        "hops": hops,
        "family": params.family,
        "year": params.year,
        "kind": params.kind,
        "relationship": params.relationship,
    }


def graph(request: Request):
    identifier = str(UUID(request.path_params["entity_id"]))
    return json_response(service(request).corpus_graph(identifier, **graph_arguments(request)))


def passages(request: Request):
    identifier = str(UUID(request.path_params["entity_id"]))
    return json_response(service(request).corpus_passages(identifier, **graph_arguments(request)))


async def failure(request, exc):
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


def create_app(retrieval=None):
    @asynccontextmanager
    async def lifespan(app):
        pool = None
        app.state.semantic_requests = deque()
        app.state.semantic_lock = threading.Lock()
        if retrieval is None:
            instance, pool = await run_in_threadpool(build_retrieval_service)
            app.state.retrieval = instance
        else:
            app.state.retrieval = retrieval
        try:
            yield
        finally:
            if pool:
                await run_in_threadpool(pool.close)

    prefix = "/corpus/v1"
    routes = [
        Route(prefix + "/search", semantic_search),
        Route(prefix + "/documents", documents),
        Route(prefix + "/facets", facets),
        Route(prefix + "/stats", stats),
        Route(prefix + "/ready", readiness),
        Route(prefix + "/entities", entities),
        Route(prefix + "/documents/{slug}", document),
        Route(prefix + "/documents/{slug}/pages/{number}", page),
        Route(prefix + "/documents/{slug}/reader/{number}", reader),
        Route(prefix + "/documents/{slug}/markdown", markdown_download),
        Route(prefix + "/documents/{slug}/assets/{name:path}", asset),
        Route(prefix + "/documents/{slug}/versions/{publication_id}/assets/{name:path}", asset),
        Route(prefix + "/documents/{slug}/versions/{publication_id}/markdown", markdown_download),
        Route(prefix + "/entities/{entity_id}", entity),
        Route(prefix + "/entities/{entity_id}/graph", graph),
        Route(prefix + "/entities/{entity_id}/passages", passages),
    ]
    return Starlette(
        routes=routes,
        lifespan=lifespan,
        exception_handlers={
            FileNotFoundError: failure,
            ValidationError: failure,
            ValueError: failure,
            IndexError: failure,
            StaleArtifactError: failure,
            psycopg.Error: failure,
            httpx.HTTPError: failure,
            RuntimeError: failure,
        },
    )


app = create_app()
