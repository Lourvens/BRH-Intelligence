"""Document, page, reader, asset and Markdown routes."""

from urllib.parse import quote

from brh_core.corpus.download import markdown_export
from brh_core.corpus.storage import digest
from starlette.requests import Request
from starlette.responses import Response

from api.context import json_response, service


def document(request: Request) -> Response:
    return json_response(service(request).corpus_document(request.path_params["slug"]))


def page(request: Request) -> Response:
    return json_response(
        service(request).corpus_page(
            request.path_params["slug"], int(request.path_params["number"])
        )
    )


def reader(request: Request) -> Response:
    content = service(request).corpus_reader(
        request.path_params["slug"], int(request.path_params["number"])
    )
    # The page and reader metadata originate in one database snapshot.
    return json_response(content)


def asset(request: Request) -> Response:
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


def markdown_download(request: Request) -> Response:
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
