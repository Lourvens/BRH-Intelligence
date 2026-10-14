"""The embedder interface.

A vector store that embeds on the client holds an :class:`Embedder`. The
integrated-inference store (ADR-0004) does not — Pinecone embeds server-side —
so the type is optional throughout the codebase.
"""

from __future__ import annotations

from collections.abc import Sequence
from typing import Protocol, runtime_checkable


@runtime_checkable
class Embedder(Protocol):
    """Turns text into vectors."""

    @property
    def dimension(self) -> int:
        """Length of the vectors this embedder produces."""
        ...

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        """Embed a batch of passages for indexing."""
        ...

    def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""
        ...
