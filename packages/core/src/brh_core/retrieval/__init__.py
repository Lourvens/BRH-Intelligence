"""Retrieval — the shared core (ADR-0006).

TODO: everything here is contract-first — keep the signatures.
"""

from brh_core.retrieval.service import RetrievalService, build_retrieval_service

__all__ = ["RetrievalService", "build_retrieval_service"]
