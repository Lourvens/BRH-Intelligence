"""Small helpers shared by the ingestion stages.

TODO: implement.
"""

from __future__ import annotations

from pathlib import Path


def sha256_of_file(path: Path) -> str:
    """Content hash — the natural key for a document (ADR-0003).

    Stream the file in blocks; do not read it all into memory.
    """
    raise NotImplementedError("TODO: streaming SHA-256")


def slugify(value: str) -> str:
    """ASCII, lowercase, hyphen-separated slug from a filename stem or title.

    Example: ``"RDDCF-Vol.-5 ..."`` -> ``"rddcf-vol-5-..."``. Accents must be
    folded to ASCII (the corpus filenames are French).
    """
    raise NotImplementedError("TODO: slugify")


def infer_title(stem: str) -> str:
    """Human-readable title from a filename stem."""
    raise NotImplementedError("TODO: prettify the filename stem")


def infer_volume(stem: str) -> str | None:
    """Best-effort volume extraction (e.g. ``'Vol. 5'`` -> ``'5'``).

    Roman numerals in the corpus (``Vol. III``) should map to ``'3'``.
    """
    raise NotImplementedError("TODO: best-effort volume extraction")
