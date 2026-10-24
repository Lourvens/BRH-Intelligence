"""Discovery of locally persisted PDF artefacts."""

from __future__ import annotations

from pathlib import Path


def discover_pdfs(raw_dir: Path) -> list[Path]:
    """Return every PDF under ``raw_dir``, sorted for a stable order.

    Missing directory -> ``[]`` (not an error); sort so ingestion order is
    deterministic.
    """
    if not raw_dir.is_dir():
        return []
    return sorted(
        path for path in raw_dir.rglob("*") if path.is_file() and path.suffix.lower() == ".pdf"
    )
