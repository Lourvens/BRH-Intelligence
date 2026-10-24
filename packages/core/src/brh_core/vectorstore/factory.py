"""Vector-store factory (ADR-0003, ADR-0004).

TODO: switch on ``settings.vector_backend``:

* ``memory``             -> :class:`~brh_core.vectorstore.memory.InMemoryVectorStore`
  (needs a client-side embedder — fall back to ``HashingEmbedder``)
* ``pinecone_integrated`` -> ``PineconeIntegratedVectorStore`` (server-side embedding)
* ``pinecone``           -> :class:`~brh_core.vectorstore.pinecone_store.PineconeClientVectorStore`
  (requires a client-side embedder; raise a clear error when there is none)
"""

from __future__ import annotations

from brh_core.config import Settings, VectorBackend
from brh_core.embeddings.factory import build_embedder
from brh_core.vectorstore.base import VectorStore
from brh_core.vectorstore.memory import InMemoryVectorStore
from brh_core.vectorstore.pinecone_store import (
    PineconeClientVectorStore,
    PineconeIntegratedVectorStore,
)


def build_vector_store(settings: Settings) -> VectorStore:
    """Build the vector store selected by ``BRH_VECTOR_BACKEND``."""
    embedder = build_embedder(settings)
    if settings.vector_backend is VectorBackend.memory:
        if embedder is None:
            from brh_core.embeddings.hashing import HashingEmbedder

            embedder = HashingEmbedder(settings.embedding_dim)
        return InMemoryVectorStore(embedder)
    api_key = settings.pinecone_api_key.get_secret_value()
    if settings.vector_backend is VectorBackend.pinecone_integrated:
        return PineconeIntegratedVectorStore(
            api_key=api_key,
            index_name=settings.pinecone_index_name,
            namespace=settings.pinecone_namespace,
        )
    if embedder is None:
        raise ValueError("BRH_VECTOR_BACKEND=pinecone requires a client-side embedding provider")
    return PineconeClientVectorStore(
        embedder=embedder,
        api_key=api_key,
        index_name=settings.pinecone_index_name,
        namespace=settings.pinecone_namespace,
    )
