"""Structure-aware chunking, grouped by concern.

The public surface is two functions and one version string:

    >>> from brh_core.ingestion.chunking import chunk_pages, chunker_id
    >>> chunks = chunk_pages("doc", pages, max_tokens=448)

Modules:

* :mod:`blocks`    — Markdown → typed blocks (no policy)
* :mod:`envelope`  — the context a table must carry (title, unit, period, source)
* :mod:`tables`    — how a table is partitioned and linked (no data overlap)
* :mod:`prose`     — how paragraphs are packed under their headings
* :mod:`tokens`    — the only place that converts text to tokens
* :mod:`strategy`  — traversal, chunk identity, provenance (``v2``)
* :mod:`patterns`  — the corpus vocabulary both parsing and policy share
"""

from __future__ import annotations

from brh_core.ingestion.chunking.blocks import (
    Block,
    BlockKind,
    TableBlock,
    blocks_from_markdown,
    blocks_from_pages,
    stitch_tables,
)
from brh_core.ingestion.chunking.envelope import Envelope
from brh_core.ingestion.chunking.strategy import (
    CHUNKING_VERSION,
    StructureChunker,
    chunk_pages,
    chunker_id,
)
from brh_core.ingestion.chunking.tables import TablePart, is_series, partition
from brh_core.ingestion.chunking.tokens import (
    DEFAULT_MAX_TOKENS,
    TokenCounter,
    estimate_tokens,
    huggingface_counter,
)

__all__ = [
    "CHUNKING_VERSION",
    "DEFAULT_MAX_TOKENS",
    "Block",
    "BlockKind",
    "Envelope",
    "StructureChunker",
    "TableBlock",
    "TablePart",
    "TokenCounter",
    "blocks_from_markdown",
    "blocks_from_pages",
    "chunk_pages",
    "chunker_id",
    "estimate_tokens",
    "huggingface_counter",
    "is_series",
    "partition",
    "stitch_tables",
]
