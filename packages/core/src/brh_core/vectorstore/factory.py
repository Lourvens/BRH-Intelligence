"""Vector-store factory (ADR-0003, ADR-0004).

TODO: switch on ``settings.vector_backend``:

* ``memory``             -> :class:`~brh_core.vectorstore.memory.InMemoryVectorStore`
  (needs a client-side embedder — fall back to ``HashingEmbedder``)
* ``pinecone_integrated`` -> ``PineconeIntegratedVectorStore`` (server-side embedding)
* ``pinecone``           -> :class:`~brh_core.vectorstore.pinecone_store.PineconeClientVectorStore`
  (requires a client-side embedder; raise a clear error when there is none)
"""

from __future__ import annotations

from brh_core.config import Settings
from brh_core.vectorstore.base import VectorStore


def build_vector_store(settings: Settings) -> VectorStore:
    """Build the vector store selected by ``BRH_VECTOR_BACKEND``."""
    raise NotImplementedError("TODO: switch on settings.vector_backend")
