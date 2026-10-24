"""LangChain retriever that keeps canonical BRH retrieval as the only read path."""

from typing import Any

from langchain_core.documents import Document
from langchain_core.retrievers import BaseRetriever
from pydantic import ConfigDict, Field


class CorpusRetriever(BaseRetriever):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    service: Any
    top_k: int = Field(default=6, gt=0, le=250)
    min_score: float | None = None
    metadata_filter: dict | None = None

    def _get_relevant_documents(self, query, *, run_manager):
        chunks = self.service.retrieve(
            query, top_k=self.top_k, min_score=self.min_score, filter=self.metadata_filter
        )
        return [
            Document(
                id=chunk.chunk_id,
                page_content=chunk.text,
                metadata={
                    **chunk.metadata,
                    "score": chunk.score,
                    "document_id": chunk.document_id,
                    "page_number": chunk.page_number,
                },
            )
            for chunk in chunks
        ]
