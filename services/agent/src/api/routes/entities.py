"""Entity, graph and evidence-passage routes."""

from uuid import UUID

from starlette.requests import Request
from starlette.responses import Response

from api.context import json_response, query, service


def entity(request: Request) -> Response:
    identifier = str(UUID(request.path_params["entity_id"]))
    found = service(request).corpus_entities(entity_ids=[identifier], limit=1)
    if not found:
        raise FileNotFoundError(identifier)
    return json_response(
        {"entity": found[0], "passages": service(request).corpus_passages(identifier)}
    )


def graph_arguments(request: Request) -> dict[str, object]:
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


def graph(request: Request) -> Response:
    identifier = str(UUID(request.path_params["entity_id"]))
    return json_response(service(request).corpus_graph(identifier, **graph_arguments(request)))


def passages(request: Request) -> Response:
    identifier = str(UUID(request.path_params["entity_id"]))
    return json_response(service(request).corpus_passages(identifier, **graph_arguments(request)))
