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

    def __init__(
        self,
        settings: Settings,
        *,
        vector_store: VectorStore | None,
        repository: object,
        research=None,
    ):
        self._settings = settings
        self._vector_store = vector_store
        self._repository = repository
        self._research = research

    def _vectors(self):
        if self._vector_store is None:
            from brh_core.vectorstore.factory import build_vector_store

            self._vector_store = build_vector_store(self._settings)
        return self._vector_store

    @property
    def research(self):
        if self._research is None:
            raise RuntimeError("Research corpus is not configured")
        return self._research

    def browse_corpus(self, query):
        return self.research.queries.documents(query)

    def corpus_facets(self, query):
        return self.research.queries.facets(query)

    def corpus_stats(self):
        from brh_core.corpus.status import configured_index_target
        from brh_core.ingestion.pipeline import embed_id

        stats = self.research.queries.stats()
        target = configured_index_target(self._settings, self._repository.index_targets())
        progress = (
            self._repository.index_progress(target, embed_id(self._settings))
            if target
            else {"documents_verified": None, "vectors_verified": None}
        )
        return {
            **stats,
            "indexed_documents": progress["documents_verified"],
            "indexed_vectors": progress["vectors_verified"],
        }

    def corpus_document(self, identifier):
        return self.research.current_document(identifier)[0]

    def corpus_page(self, identifier, number):
        return self.research.page(identifier, number)

    def corpus_reader(self, identifier, number):
        return self.research.reader(identifier, number)

    def corpus_asset(self, identifier, name, publication_id=None):
        return self.research.asset(identifier, name, publication_id)

    def corpus_markdown(self, identifier, publication_id=None):
        return self.research.published_file(identifier, "document.md", publication_id)

    def corpus_readiness(self):
        return self.research.readiness()

    def corpus_entities(self, query="", **kwargs):
        return self.research.graph.entities(query, **kwargs)

    def corpus_entity_page(self, query):
        items, total = self.research.graph.entities(
            query.q,
            kind=query.kind,
            limit=query.page_size,
            offset=(query.page - 1) * query.page_size,
            with_total=True,
            document_id=query.document_id,
            family=query.family,
            year=query.year,
        )
        return {"items": items, "total": total, "page": query.page, "page_size": query.page_size}

    def corpus_atlas(self, query):
        from brh_core.db.research_atlas import ResearchAtlasRepository

        return ResearchAtlasRepository(self.research.graph.pool).overview(query)

    def corpus_edge_evidence(self, edge_id, **kwargs):
        from brh_core.db.research_atlas import ResearchAtlasRepository

        return ResearchAtlasRepository(self.research.graph.pool).evidence(edge_id, **kwargs)

    def corpus_graph(self, entity_id, **kwargs):
        return self.research.neighborhood(entity_id, **kwargs)

    def corpus_passages(self, entity_id, **kwargs):
        return self.research.graph_passages(entity_id, **kwargs)

    def semantic_corpus(self, query):
        from brh_core.corpus.service import StaleArtifactError

        if not query.q.strip():
            return {"items": [], "total": 0, "page": 1, "page_size": 20, "bounded": True}
        filtered = bool(query.family or query.year or query.entity_id or query.document_id)
        eligible = self.research.queries.eligible_document_ids(query) if filtered else None
        scope = {"document_id": {"$in": eligible}} if eligible is not None else None
        hits = self.retrieve(query.q, top_k=20, filter=scope) if eligible != [] else []
        canonical = self._repository.get_documents(hit.document_id for hit in hits)
        documents = {}
        for hit in hits:
            if hit.document_id in documents:
                continue
            try:
                document, _ = self.research.current_document(hit.document_id)
            except (FileNotFoundError, StaleArtifactError, ValueError):
                continue
            # A readable artifact may arrive before its canonical reindex completes.
            content_key = canonical[hit.document_id].metadata.get("content_key", "")
            if f":ocr:{document.artifact_hash}:" not in content_key:
                continue
            documents[hit.document_id] = document.model_copy(
                update={
                    "match_page": hit.page_number,
                    "snippet": hit.text[:400],
                }
            )
        return {
            "items": list(documents.values()),
            "total": len(documents),
            "page": 1,
            "page_size": 20,
            "bounded": True,
        }

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
        candidates = self._vectors().search(question, top_k=min(k * 4, 1000), filter=filter)
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
    from brh_core.corpus.service import ResearchCorpus
    from brh_core.db.pool import open_pool
    from brh_core.db.repository import CorpusRepository
    from brh_core.db.research_graph import ResearchGraphRepository
    from brh_core.db.research_query import ResearchQueryRepository

    settings = settings or get_settings()
    pool = open_pool(settings)
    try:
        pool.open(wait=True)
        service = RetrievalService(
            settings,
            vector_store=None,
            repository=CorpusRepository(pool),
            research=ResearchCorpus(
                settings, ResearchQueryRepository(pool), ResearchGraphRepository(pool)
            ),
        )
        return service, pool
    except Exception:
        pool.close()
        raise
