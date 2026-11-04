"""Research, operations and corpus routes mounted in the Agent Server."""

from contextlib import asynccontextmanager
from typing import Any

from brh_core.config import get_settings
from brh_core.operations import OperationsRepository
from brh_core.retrieval import build_retrieval_service
from starlette.applications import Starlette
from starlette.concurrency import run_in_threadpool
from starlette.routing import Route

from access.middleware import install_security
from api.errors import EXCEPTION_HANDLERS
from api.routes import corpus, documents, entities, operations, search


def create_app(
    retrieval: Any = None, operations_store: Any = None, settings: Any = None
) -> Starlette:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: Starlette):
        app.state.retrieval = retrieval
        pool = None
        if retrieval is None:
            app.state.retrieval, pool = await run_in_threadpool(build_retrieval_service)
        app.state.operations = operations_store
        app.state.operations_settings = settings
        if operations_store is None and pool is not None:
            app.state.operations = OperationsRepository(pool, settings.feedback_hourly_limit)
        try:
            yield
        finally:
            if pool:
                await run_in_threadpool(pool.close)

    prefix = "/corpus/v1"
    routes = [
        Route("/feedback/v1", operations.submit_feedback, methods=["POST"]),
        Route("/admin/v1/overview", operations.overview),
        Route("/admin/v1/feedback", operations.list_feedback),
        Route("/admin/v1/feedback/{identifier}", operations.update_feedback, methods=["PATCH"]),
        Route(prefix + "/search", search.semantic_search),
        Route(prefix + "/documents", corpus.documents),
        Route(prefix + "/facets", corpus.facets),
        Route(prefix + "/stats", corpus.stats),
        Route(prefix + "/ready", corpus.readiness),
        Route(prefix + "/entities", corpus.entities),
        Route(prefix + "/graph", corpus.atlas),
        Route(prefix + "/graph/edges/{edge_id}/evidence", corpus.edge_evidence),
        Route(prefix + "/documents/{slug}", documents.document),
        Route(prefix + "/documents/{slug}/pages/{number}", documents.page),
        Route(prefix + "/documents/{slug}/reader/{number}", documents.reader),
        Route(prefix + "/documents/{slug}/markdown", documents.markdown_download),
        Route(prefix + "/documents/{slug}/assets/{name:path}", documents.asset),
        Route(
            prefix + "/documents/{slug}/versions/{publication_id}/assets/{name:path}",
            documents.asset,
        ),
        Route(
            prefix + "/documents/{slug}/versions/{publication_id}/markdown",
            documents.markdown_download,
        ),
        Route(prefix + "/entities/{entity_id}", entities.entity),
        Route(prefix + "/entities/{entity_id}/graph", entities.graph),
        Route(prefix + "/entities/{entity_id}/passages", entities.passages),
    ]
    application = Starlette(
        routes=routes,
        lifespan=lifespan,
        exception_handlers=EXCEPTION_HANDLERS,
    )
    install_security(application, settings)
    return application


app = create_app()
