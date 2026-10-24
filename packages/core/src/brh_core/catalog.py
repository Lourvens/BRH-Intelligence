"""Atomic export of the parsed document catalog.

``data/processed/catalog.json`` is a small inventory of the corpus so
non-Python surfaces (the Next.js PDF route) can map a citation slug to the
source file and title **without re-implementing the ingestion slug rules**.

Derived artefact: safe to delete and regenerate.

"""

from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

from brh_core.config import Settings

CATALOG_FILENAME = "catalog.json"


def catalog_path(settings: Settings) -> Path:
    """Where the catalog lives (``<processed_dir>/catalog.json``)."""
    return settings.resolved_processed_dir / CATALOG_FILENAME


def write_catalog(settings: Settings, repository: Any) -> Path:
    """Write the catalog from the documents currently in Postgres.

    ``repository`` is a :class:`brh_core.db.repository.CorpusRepository`.

    Shape: ``{"documents": [{"document_id", "slug", "title", "volume",
    "issue", "language", "page_count", "source_path", "source_url"}, ...]}``.
    The web PDF route reads this.
    """
    documents = []
    for document in sorted(repository.list_documents(), key=lambda item: (item.title, item.slug)):
        documents.append(
            {
                "document_id": document.document_id,
                "sha256": document.sha256,
                "slug": document.slug,
                "title": document.title,
                "volume": document.volume,
                "issue": document.issue,
                "language": document.language.value,
                "page_count": document.page_count,
                "source_path": document.source_path,
                "source_url": document.source_url,
            }
        )
    target = catalog_path(settings)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(dir=target.parent, prefix=f".{target.name}.", suffix=".tmp")
    temporary = Path(name)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump({"documents": documents}, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary, target)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise
    return target


def read_catalog(settings: Settings | None = None) -> list[dict[str, Any]]:
    """Read the catalog, returning ``[]`` when it does not exist yet."""
    settings = settings or Settings()
    path = catalog_path(settings)
    if not path.is_file():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    documents = payload.get("documents", [])
    if not isinstance(documents, list):
        raise ValueError(f"invalid catalog shape in {path}")
    return [document for document in documents if isinstance(document, dict)]


def main() -> None:
    """CLI: ``python -m brh_core.catalog``."""
    from brh_core.db.pool import open_pool
    from brh_core.db.repository import CorpusRepository

    settings = Settings()
    pool = open_pool(settings)
    pool.open()
    try:
        print(write_catalog(settings, CorpusRepository(pool)))
    finally:
        pool.close()


if __name__ == "__main__":
    main()
