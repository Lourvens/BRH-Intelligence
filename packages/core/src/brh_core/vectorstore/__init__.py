"""Vector-store adapters (ADR-0003, ADR-0004).

The :class:`VectorStore` interface takes **text** in and returns
:class:`~brh_core.models.RetrievedChunk` out. Whether embedding happens on the
client or inside Pinecone is an implementation detail of the adapter, so
swapping backends is an env change.

Production uses Pinecone integrated inference; the memory store supports offline tests.
"""

from brh_core.vectorstore.base import VectorStore
from brh_core.vectorstore.factory import build_vector_store
from brh_core.vectorstore.memory import InMemoryVectorStore
from brh_core.vectorstore.pinecone_store import (
    PineconeClientVectorStore,
    PineconeIntegratedRetriever,
    PineconeIntegratedVectorStore,
)

__all__ = [
    "InMemoryVectorStore",
    "PineconeClientVectorStore",
    "PineconeIntegratedRetriever",
    "PineconeIntegratedVectorStore",
    "VectorStore",
    "build_vector_store",
]
