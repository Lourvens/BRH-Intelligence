"""Catalog export.

``data/processed/catalog.json`` is a small inventory of the corpus so
non-Python surfaces (the Next.js PDF route) can map a citation slug to the
source file and title **without re-implementing the ingestion slug rules**.

Derived artefact: safe to delete and regenerate.

TODO: implement.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from brh_core.config import Settings

CATALOG_FILENAME = "catalog.json"


def catalog_path(settings: Settings) -> Path:
    """Where the catalog lives (``<processed_dir>/catalog.json``)."""
    raise NotImplementedError("TODO: return the catalog path")


def write_catalog(settings: Settings, repository: Any) -> Path:
    """Write the catalog from the documents currently in Postgres.

    ``repository`` is a :class:`brh_core.db.repository.CorpusRepository`.

    Shape: ``{"documents": [{"document_id", "slug", "title", "volume",
    "issue", "language", "page_count", "source_path", "source_url"}, ...]}``.
    The web PDF route reads this.
    """
    raise NotImplementedError("TODO: serialise documents to catalog.json")


def read_catalog(settings: Settings | None = None) -> list[dict[str, Any]]:
    """Read the catalog, returning ``[]`` when it does not exist yet."""
    raise NotImplementedError("TODO: read catalog.json")


def main() -> None:
    """CLI: ``python -m brh_core.catalog``."""
    raise NotImplementedError("TODO: open a pool, write the catalog, close it")


if __name__ == "__main__":
    main()
