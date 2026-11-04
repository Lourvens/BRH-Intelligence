"""Request-scoped services and JSON serialization shared by corpus routes."""

from typing import Any

from brh_core.corpus.models import CorpusQuery
from pydantic import TypeAdapter
from starlette.requests import Request
from starlette.responses import JSONResponse


def json_response(value: Any) -> JSONResponse:
    return JSONResponse(TypeAdapter(object).dump_python(value, mode="json"))


def service(request: Request) -> Any:
    return request.app.state.retrieval


def query(request: Request) -> CorpusQuery:
    parameters = dict(request.query_params)
    parameters.pop("hops", None)
    return CorpusQuery.model_validate(parameters)
