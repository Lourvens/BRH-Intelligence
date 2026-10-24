"""Stable Pinecone exports and LangChain retriever compatibility."""

from __future__ import annotations

from typing import Any

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict, Field

from brh_core.vectorstore.pinecone_integrated import PineconeIntegratedVectorStore


class PineconeIntegratedRetriever(BaseRetriever):
    """Low-level adapter; user-facing retrieval uses RetrievalService."""

    model_config = ConfigDict(arbitrary_types_allowed=True)
    store: PineconeIntegratedVectorStore
    top_k: int = Field(default=6, gt=0)
    metadata_filter: dict[str, object] | None = None

    def _get_relevant_documents(self, query: str, *, run_manager: Any) -> list[Document]:
        hits = self.store.search(query, top_k=self.top_k, filter=self.metadata_filter)
        return [
            Document(
                id=hit.chunk_id,
                page_content=hit.text,
                metadata={**hit.metadata, "score": hit.score},
            )
            for hit in hits
        ]


class PineconeClientVectorStore:
    """Reject a backend outside the selected hosted-embedding architecture."""

    def __init__(self, **kwargs):
        raise ValueError(
            "Use BRH_VECTOR_BACKEND=pinecone_integrated with the Pinecone hosted model"
        )


__all__ = [
    "PineconeClientVectorStore",
    "PineconeIntegratedRetriever",
    "PineconeIntegratedVectorStore",
]
