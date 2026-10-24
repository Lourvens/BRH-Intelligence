"""Embedder factory (ADR-0004).

Returns ``None`` for the ``pinecone`` provider: with Pinecone integrated
inference there is no client-side embedder, and returning ``None`` makes that
explicit rather than hiding a no-op object.

TODO: implement the ``EmbeddingProvider`` switch.
"""

from __future__ import annotations

from brh_core.config import EmbeddingProvider, Settings
from brh_core.embeddings.base import Embedder
from brh_core.embeddings.hashing import HashingEmbedder


def build_embedder(settings: Settings) -> Embedder | None:
    """Build the embedder selected by ``BRH_EMBEDDING_PROVIDER``.

    * ``pinecone`` -> ``None`` (server-side embedding)
    * ``openai``   -> :class:`~brh_core.embeddings.openai.OpenAIEmbedder`
    * ``hashing``  -> :class:`~brh_core.embeddings.hashing.HashingEmbedder`
    """
    if settings.embedding_provider is EmbeddingProvider.hashing:
        return HashingEmbedder(settings.embedding_dim)
    if settings.embedding_provider is EmbeddingProvider.openai:
        from brh_core.embeddings.openai import OpenAIEmbedder

        return OpenAIEmbedder(
            model=settings.embedding_model,
            api_key=settings.openai_api_key.get_secret_value(),
            base_url=settings.openai_base_url,
            dimension=settings.embedding_dim,
        )
    return None
