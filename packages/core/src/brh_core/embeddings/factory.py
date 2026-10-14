"""Embedder factory (ADR-0004).

Returns ``None`` for the ``pinecone`` provider: with Pinecone integrated
inference there is no client-side embedder, and returning ``None`` makes that
explicit rather than hiding a no-op object.

TODO: implement the ``EmbeddingProvider`` switch.
"""

from __future__ import annotations

from brh_core.config import Settings
from brh_core.embeddings.base import Embedder


def build_embedder(settings: Settings) -> Embedder | None:
    """Build the embedder selected by ``BRH_EMBEDDING_PROVIDER``.

    * ``pinecone`` -> ``None`` (server-side embedding)
    * ``openai``   -> :class:`~brh_core.embeddings.openai.OpenAIEmbedder`
    * ``hashing``  -> :class:`~brh_core.embeddings.hashing.HashingEmbedder`
    """
    raise NotImplementedError("TODO: switch on settings.embedding_provider")
