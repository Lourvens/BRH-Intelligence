"""Chunking entry point — kept stable while the strategy lives in a package.

The implementation is :mod:`brh_core.ingestion.chunking`, split by concern:
parsing, envelope, table policy, prose policy, token measurement, traversal.
This module exists so callers and docs keep one obvious import path while the
v2 hybrid strategy evolves behind it.

    >>> from brh_core.ingestion.chunk import chunk_pages, chunker_id
"""

from __future__ import annotations

from brh_core.ingestion.chunking import (
    CHUNKING_VERSION,
    DEFAULT_MAX_TOKENS,
    StructureChunker,
    chunk_pages,
    chunker_id,
    estimate_tokens,
    huggingface_counter,
)

__all__ = [
    "CHUNKING_VERSION",
    "DEFAULT_MAX_TOKENS",
    "StructureChunker",
    "chunk_pages",
    "chunker_id",
    "estimate_tokens",
    "huggingface_counter",
]
