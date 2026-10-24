"""Ingestion: turn canonical OCR/PDF sources into pages and chunks.

The CLI can discover and download ``brh.ht`` publications before processing
local files from ``data/raw``. ``--index`` enables verified hosted embedding.

The extraction stage is PaddleOCR-VL-first: the batch runner produces the
canonical page-marked Markdown consumed by the relational ingestion bridge.
PyMuPDF is a fallback for documents that do not yet have an OCR artifact.

The exports below are resolved lazily so that importing a submodule — say the OCR
runner on a laptop or in Colab — does not drag in Postgres and Pinecone.
"""

from __future__ import annotations

from typing import Any

__all__ = ["IngestionReport", "run_ingestion"]


def __getattr__(name: str) -> Any:
    if name in __all__:
        from brh_core.ingestion import pipeline

        return getattr(pipeline, name)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
