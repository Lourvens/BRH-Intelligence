"""Deterministic metadata derived from a source artefact."""

from __future__ import annotations

import hashlib
import re
import unicodedata
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5


def sha256_of_file(path: Path) -> str:
    """Content hash — the natural key for a document (ADR-0003).

    Stream the file in blocks; do not read it all into memory.
    """
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1 << 20), b""):
            digest.update(block)
    return digest.hexdigest()


def slugify(value: str) -> str:
    """ASCII, lowercase, hyphen-separated slug from a filename stem or title.

    Example: ``"RDDCF-Vol.-5 ..."`` -> ``"rddcf-vol-5-..."``. Accents must be
    folded to ASCII (the corpus filenames are French).
    """
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii").lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug or "document"


def infer_title(stem: str) -> str:
    """Human-readable title from a filename stem."""
    value = re.sub(r"[_-]+", " ", stem).strip()
    value = re.sub(r"\s+", " ", value)
    return value or "Document BRH"


def infer_volume(stem: str) -> str | None:
    """Best-effort volume extraction (e.g. ``'Vol. 5'`` -> ``'5'``).

    Roman numerals in the corpus (``Vol. III``) should map to ``'3'``.
    """
    match = re.search(r"\bvol(?:ume)?\.?\s*([0-9]+|[IVXLCDM]+)\b", stem, re.I)
    if not match:
        return None
    value = match.group(1)
    if value.isdigit():
        return value
    roman = {"I": 1, "V": 5, "X": 10, "L": 50, "C": 100, "D": 500, "M": 1000}
    total = 0
    previous = 0
    for symbol in reversed(value.upper()):
        current = roman.get(symbol, 0)
        total += -current if current < previous else current
        previous = current
    return str(total) if total else None


def document_id_for_sha256(sha256: str) -> str:
    """Return a stable UUID for content identity across ingestion reruns."""
    return str(uuid5(NAMESPACE_URL, f"brh-intelligence:document:{sha256}"))
