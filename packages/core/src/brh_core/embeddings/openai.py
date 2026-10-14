"""OpenAI-compatible embedder (ADR-0004).

Works against the OpenAI API or any compatible gateway via ``base_url``.

TODO: implement using the ``openai`` SDK's ``embeddings.create``. When the
model is dimension-aware (``text-embedding-3-*``) and a dimension is
configured, pass ``dimensions=``. Preserve input order (sort by ``.index``).
"""

from __future__ import annotations

from collections.abc import Sequence


class OpenAIEmbedder:
    """Client-side embeddings via the OpenAI embeddings endpoint."""

    def __init__(
        self,
        *,
        model: str,
        api_key: str,
        base_url: str = "",
        dimension: int = 0,
    ) -> None:
        raise NotImplementedError("TODO: construct the OpenAI client and store config")

    @property
    def dimension(self) -> int:
        raise NotImplementedError("TODO: return the configured/derived dimension")

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        raise NotImplementedError("TODO: batch embed")

    def embed_query(self, text: str) -> list[float]:
        raise NotImplementedError("TODO: single embed")
