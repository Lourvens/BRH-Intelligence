"""Ingestion: turn source PDFs into pages, chunks, and vectors.

Auto-discovery of ``brh.ht`` is a roadmap item; today the discovery step reads
local files from ``data/raw`` (ADR-0005).

The OCR stage is implemented — :mod:`brh_core.ingestion.ocr` (batch runner and
ledger), :mod:`brh_core.ingestion.engines` (PaddleOCR-VL behind one interface)
and :mod:`brh_core.ingestion.markdown` (markup cleanup). The rest of the pipeline
is still a stub.

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
