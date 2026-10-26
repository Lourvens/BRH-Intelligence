"""Attach stable publication provenance to an exported Markdown document."""

import json


def markdown_export(data: bytes, publication: dict) -> bytes:
    provenance = {
        "title": publication["manifest"].get("title")
        or f"Document BRH {publication['sha256'][:8]}",
        "source_sha256": publication["sha256"],
        "markdown_sha256": publication["artifact_hash"],
        "publication_id": publication["publication_id"],
        "published_at": publication["published_at"].isoformat(),
    }
    header = json.dumps(provenance, ensure_ascii=False).replace("-->", r"\u002d\u002d\u003e")
    return f"<!-- BRH provenance: {header} -->\n\n".encode() + data
