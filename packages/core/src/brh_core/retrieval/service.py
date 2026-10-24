"""Canonical retrieval, stale-hit rejection and citations for every surface."""

from __future__ import annotations

import math
from hashlib import sha256
from uuid import UUID

from brh_core.citations import citation_from_chunk
from brh_core.config import Settings, get_settings
from brh_core.models import Citation, Document, RetrievedChunk, SearchResult
from brh_core.vectorstore.base import VectorStore


class RetrievalService:
    """Resolve vector candidates against current Postgres evidence."""

    def __init__(self, settings: Settings, *, vector_store: VectorStore, repository: object):
        self._settings = settings
        self._vector_store = vector_store
        self._repository = repository

    def retrieve(
        self,
        question: str,
        *,
        top_k: int | None = None,
        min_score: float | None = None,
        filter: dict | None = None,
    ) -> list[RetrievedChunk]:
        k = self._settings.retrieval_top_k if top_k is None else top_k
        threshold = self._settings.retrieval_min_score if min_score is None else min_score
        if not question.strip() or k <= 0:
            return []
        candidates = self._vector_store.search(question, top_k=min(k * 4, 1000), filter=filter)
        stored = self._repository.get_chunks(hit.chunk_id for hit in candidates)
        documents = self._repository.get_documents(hit.document_id for hit in candidates)
        accepted = {}
        manifests = {}
        ledger_factory = getattr(self._repository, "index_ledger", None)
        if ledger_factory:
            from brh_core.ingestion.pipeline import target_id

            ledger = ledger_factory()
            target = target_id(self._settings, self._vector_store)
            manifests = {key: ledger.load(target, key) for key in documents}
        for hit in candidates:
            chunk = stored.get(hit.chunk_id)
            document = documents.get(hit.document_id)
            if (
                chunk is None
                or document is None
                or chunk.document_id != hit.document_id
                or chunk.text != hit.text
                or chunk.page_number != hit.page_number
                or not math.isfinite(hit.score)
                or hit.score < threshold
            ):
                continue
            if hit.metadata.get("sha256", document.sha256) != document.sha256:
                continue
            manifest = manifests.get(hit.document_id)
            if manifest is not None and (
                manifest.status != "succeeded"
                or not manifest.version.startswith(document.metadata.get("content_key", "") + ":")
                or hit.chunk_id not in manifest.desired_ids
                or hit.metadata.get("index_version")
                != sha256(manifest.version.encode()).hexdigest()
            ):
                continue
            canonical = hit.model_copy(
                update={
                    "metadata": {
                        **hit.metadata,
                        **chunk.metadata,
                        "page_end": chunk.page_end or chunk.page_number,
                        "section_path": list(chunk.section_path),
                        "chunk_type": chunk.chunk_type.value,
                    }
                }
            )
            if hit.chunk_id not in accepted or hit.score > accepted[hit.chunk_id].score:
                accepted[hit.chunk_id] = canonical
        ranked = sorted(accepted.values(), key=lambda hit: (-hit.score, hit.chunk_id))[:k]
        # Preserve independent table rows on the same page. Expand at most one
        # adjacent fragment per selected hit and never cross document/table.
        expanded = list(ranked)
        seen = {hit.chunk_id for hit in ranked}
        for hit in ranked:
            if len(expanded) >= k * 2:
                break
            neighbor_ids = [hit.metadata.get("prev_chunk_id"), hit.metadata.get("next_chunk_id")]
            neighbors = self._repository.get_chunks(key for key in neighbor_ids if key)
            for neighbor in neighbors.values():
                if neighbor.chunk_id in seen or neighbor.document_id != hit.document_id:
                    continue
                if not hit.metadata.get("table_id") or (
                    neighbor.metadata.get("table_id") != hit.metadata["table_id"]
                ):
                    continue
                seen.add(neighbor.chunk_id)
                expanded.append(
                    RetrievedChunk(
                        chunk_id=neighbor.chunk_id,
                        document_id=neighbor.document_id,
                        page_number=neighbor.page_number,
                        text=neighbor.text,
                        score=hit.score,
                        metadata={
                            **neighbor.metadata,
                            "expanded_from": hit.chunk_id,
                            "page_end": neighbor.page_end or neighbor.page_number,
                        },
                    )
                )
                break
        return expanded

    def search(self, question: str, *, top_k=None, min_score=None, filter=None) -> SearchResult:
        chunks = self.retrieve(question, top_k=top_k, min_score=min_score, filter=filter)
        return SearchResult(
            question=question,
            chunks=tuple(chunks),
            citations=tuple(self.citations(chunks)),
            grounded=bool(chunks),
        )

    def citations(self, chunks: list[RetrievedChunk]) -> list[Citation]:
        documents = self._repository.get_documents(chunk.document_id for chunk in chunks)
        citations = []
        seen = set()
        for chunk in chunks:
            document = documents.get(chunk.document_id)
            if document is None:
                continue
            # Cite both ends of a multi-page passage.
            for page in dict.fromkeys(
                (chunk.page_number, chunk.metadata.get("page_end", chunk.page_number))
            ):
                key = (chunk.document_id, int(page))
                if key in seen:
                    continue
                seen.add(key)
                page_chunk = chunk.model_copy(update={"page_number": int(page)})
                citations.append(
                    citation_from_chunk(
                        page_chunk,
                        slug=document.slug,
                        title=document.title,
                        base_url=self._settings.public_pdf_base_url,
                        source_url=document.source_url,
                    )
                )
        return citations

    def get_document(self, identifier: str) -> Document | None:
        try:
            UUID(identifier)
        except ValueError:
            return self._repository.get_document_by_slug(identifier)
        return self._repository.get_document(identifier) or self._repository.get_document_by_slug(
            identifier
        )

    def list_documents(self) -> list[Document]:
        return self._repository.list_documents()

    def get_page_text(self, identifier: str, page_number: int) -> str | None:
        document = self.get_document(identifier)
        page = self._repository.get_page(document.document_id, page_number) if document else None
        return page.text if page else None

    def stats(self) -> dict[str, int]:
        return self._repository.stats()

    def as_retriever(self, **kwargs):
        from brh_core.retrieval.langchain import CorpusRetriever

        return CorpusRetriever(service=self, **kwargs)


def build_retrieval_service(settings: Settings | None = None):
    from brh_core.db.pool import open_pool
    from brh_core.db.repository import CorpusRepository
    from brh_core.vectorstore.factory import build_vector_store

    settings = settings or get_settings()
    pool = open_pool(settings)
    try:
        pool.open(wait=True)
        service = RetrievalService(
            settings, vector_store=build_vector_store(settings), repository=CorpusRepository(pool)
        )
        return service, pool
    except Exception:
        pool.close()
        raise
