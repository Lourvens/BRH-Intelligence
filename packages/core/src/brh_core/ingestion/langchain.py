"""Canonical LangChain document projection for BRH chunks."""

from __future__ import annotations

from langchain_core.documents import Document as LangChainDocument

from brh_core.models import Chunk, Document


def chunk_to_langchain_document(
    chunk: Chunk,
    source: Document,
    *,
    chunker_id: str,
    tokenizer_id: str,
    embedding_id: str,
) -> LangChainDocument:
    """Project one frozen BRH chunk into the LangChain integration boundary."""
    if chunk.document_id != source.document_id:
        raise ValueError("Chunk and source document identities differ")
    metadata = {
        "document_id": source.document_id,
        "sha256": source.sha256,
        "page_number": chunk.page_number,
        "page_end": chunk.page_end or chunk.page_number,
        "chunk_type": chunk.chunk_type.value,
        "section_path": list(chunk.section_path),
        "chunker_id": chunker_id,
        "tokenizer_id": tokenizer_id,
        "embedding_id": embedding_id,
    }
    return LangChainDocument(page_content=chunk.text, metadata=metadata, id=chunk.chunk_id)
