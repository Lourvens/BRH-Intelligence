"""Retrieval — the shared core (ADR-0006).

RetrievalService resolves remote candidates against the canonical corpus and
exposes a LangChain retriever with the same provenance checks.
"""

from brh_core.retrieval.service import RetrievalService, build_retrieval_service

__all__ = ["RetrievalService", "build_retrieval_service"]
