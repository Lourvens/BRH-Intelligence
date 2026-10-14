"""The one retrieval implementation every surface uses (ADR-0006).

``RetrievalService`` owns ranking input, score thresholding, page-level
de-duplication, and citation assembly. The LangGraph agent, the MCP server, and
tests all call this — none of them touch Pinecone or Postgres read paths
directly.

TODO: implement. Keep the signatures; they are the shared contract.
"""

from __future__ import annotations

from brh_core.config import Settings
from brh_core.models import (
    Citation,
    Document,
    RetrievedChunk,
    SearchResult,
)
from brh_core.vectorstore.base import VectorStore


class RetrievalService:
    """Semantic search plus enough document context to cite results."""

    def __init__(
        self,
        settings: Settings,
        *,
        vector_store: VectorStore,
        repository: object,
    ) -> None:
        # ``repository`` is a brh_core.db.repository.CorpusRepository.
        self._settings = settings
        self._vector_store = vector_store
        self._repository = repository

    def retrieve(
        self,
        question: str,
        *,
        top_k: int | None = None,
        min_score: float | None = None,
    ) -> list[RetrievedChunk]:
        """Return scored chunks above the threshold, de-duplicated by page.

        Defaults come from ``settings.retrieval_top_k`` /
        ``settings.retrieval_min_score``. Keep the best-scoring chunk per
        ``(document_id, page_number)``.
        """
        raise NotImplementedError("TODO: search + threshold + de-dupe by page")

    def search(
        self,
        question: str,
        *,
        top_k: int | None = None,
        min_score: float | None = None,
    ) -> SearchResult:
        """Retrieve and assemble the user-facing citations."""
        raise NotImplementedError("TODO: retrieve() + citations() -> SearchResult")

    def citations(self, chunks: list[RetrievedChunk]) -> list[Citation]:
        """Join hits to document metadata to build clickable citations."""
        raise NotImplementedError("TODO: join hits to documents, build citations")

    # --- read helpers used by the MCP server (ADR-0007) ----------------

    def get_document(self, identifier: str) -> Document | None:
        """Look up a document by id **or** slug."""
        raise NotImplementedError("TODO: id lookup, then slug lookup")

    def list_documents(self) -> list[Document]:
        raise NotImplementedError("TODO: delegate to the repository")

    def get_page_text(self, identifier: str, page_number: int) -> str | None:
        raise NotImplementedError("TODO: resolve document, then fetch the page")

    def stats(self) -> dict[str, int]:
        raise NotImplementedError("TODO: delegate to the repository")


def build_retrieval_service(settings: Settings | None = None) -> tuple[RetrievalService, object]:
    """Build a live retrieval service plus its connection pool.

    Returns ``(service, pool)``. The caller owns the pool's lifetime and must
    close it (``pool.close()``) on shutdown.
    """
    raise NotImplementedError("TODO: open pool -> repository -> vector store -> service")
