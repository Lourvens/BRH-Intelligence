"""Corpus browse, facet, stats, readiness and atlas routes."""

from brh_core.corpus.models import GlobalGraphQuery
from pydantic import TypeAdapter
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from brh_agent.api.responses import json_response, query, service


def documents(request: Request) -> Response:
    return json_response(service(request).browse_corpus(query(request)))


def facets(request: Request) -> Response:
    return json_response(service(request).corpus_facets(query(request)))


def stats(request: Request) -> Response:
    return json_response(service(request).corpus_stats())


def readiness(request: Request) -> Response:
    result = service(request).corpus_readiness()
    return JSONResponse(
        TypeAdapter(object).dump_python(result, mode="json"),
        status_code=200 if result["ready"] else 503,
    )


def entities(request: Request) -> Response:
    return json_response(service(request).corpus_entity_page(query(request)))


def atlas(request: Request) -> Response:
    params = GlobalGraphQuery.model_validate(dict(request.query_params))
    return json_response(service(request).corpus_atlas(params))


def edge_evidence(request: Request) -> Response:
    params = query(request)
    return json_response(
        service(request).corpus_edge_evidence(
            request.path_params["edge_id"], page=params.page, page_size=params.page_size
        )
    )
