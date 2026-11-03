"""Thin research read routes mounted in the existing Agent Server."""

import threading
from collections import deque
from contextlib import asynccontextmanager
from typing import Any

import httpx
import psycopg
from brh_core.corpus.service import StaleArtifactError
from brh_core.retrieval import build_retrieval_service
from pydantic import ValidationError
from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.routing import Route

from brh_agent import corpus_routes, document_routes, entity_routes, search_routes
from brh_agent.http_support import failure


def create_app(retrieval: Any = None) -> Starlette:
    @asynccontextmanager
    async def lifespan(app: Starlette):
        app.state.semantic_requests = deque()
        app.state.semantic_lock = threading.Lock()
        app.state.retrieval = retrieval
        pool = None
        if retrieval is None:
            app.state.retrieval, pool = await run_in_threadpool(build_retrieval_service)
        try:
            yield
        finally:
            if pool:
                await run_in_threadpool(pool.close)

    prefix = "/corpus/v1"
    routes = [
        Route(prefix + "/search", search_routes.semantic_search),
        Route(prefix + "/documents", corpus_routes.documents),
        Route(prefix + "/facets", corpus_routes.facets),
        Route(prefix + "/stats", corpus_routes.stats),
        Route(prefix + "/ready", corpus_routes.readiness),
        Route(prefix + "/entities", corpus_routes.entities),
        Route(prefix + "/graph", corpus_routes.atlas),
        Route(prefix + "/graph/edges/{edge_id}/evidence", corpus_routes.edge_evidence),
        Route(prefix + "/documents/{slug}", document_routes.document),
        Route(prefix + "/documents/{slug}/pages/{number}", document_routes.page),
        Route(prefix + "/documents/{slug}/reader/{number}", document_routes.reader),
        Route(prefix + "/documents/{slug}/markdown", document_routes.markdown_download),
        Route(prefix + "/documents/{slug}/assets/{name:path}", document_routes.asset),
        Route(
            prefix + "/documents/{slug}/versions/{publication_id}/assets/{name:path}",
            document_routes.asset,
        ),
        Route(
            prefix + "/documents/{slug}/versions/{publication_id}/markdown",
            document_routes.markdown_download,
        ),
        Route(prefix + "/entities/{entity_id}", entity_routes.entity),
        Route(prefix + "/entities/{entity_id}/graph", entity_routes.graph),
        Route(prefix + "/entities/{entity_id}/passages", entity_routes.passages),
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
