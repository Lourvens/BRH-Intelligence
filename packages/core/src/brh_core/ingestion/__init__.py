"""Ingestion: turn source PDFs into pages, chunks, and vectors.

Auto-discovery of ``brh.ht`` is a roadmap item; today the discovery step reads
local files from ``data/raw`` (ADR-0005).

TODO: implement the stages.
"""

from brh_core.ingestion.pipeline import IngestionReport, run_ingestion

__all__ = ["IngestionReport", "run_ingestion"]
