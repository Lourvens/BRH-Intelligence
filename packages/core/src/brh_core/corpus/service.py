"""Compose research reads from current Markdown and indexed projections."""

from pathlib import PurePosixPath

from brh_core.corpus.artifacts import official_pdf
from brh_core.corpus.models import DocumentPage
from brh_core.corpus.publication import RASTER_SUFFIXES, published_bytes
from brh_core.corpus.storage import publication_storage


class StaleArtifactError(RuntimeError):
    pass


class ResearchCorpus:
    def __init__(self, settings, queries, graph):
        self.queries = queries
        self.graph = graph
        self.storage = publication_storage(settings)

    def current_document(self, identifier):
        document = self.queries.document(identifier)
        if document is None:
            raise FileNotFoundError(identifier)
        if not document.publication_id:
            raise StaleArtifactError("Document has not been published")
        return document, None

    def page(self, identifier, number):
        return self.reader(identifier, number)["content"]

    def reader(self, identifier, number):
        document, markdown = self.queries.page_snapshot(identifier, number)
        if not document.publication_id:
            raise StaleArtifactError("Document has not been published")
        content = DocumentPage(
            document_id=document.document_id,
            slug=document.slug,
            title=document.title,
            artifact_hash=document.artifact_hash,
            publication_id=document.publication_id,
            published_at=document.published_at,
            source_sha256=document.sha256,
            page_number=number,
            page_count=document.page_count,
            markdown=markdown,
            pdf_url=official_pdf(next(iter(document.source_urls), None), number),
        )
        return {"document": document, "content": content}

    def published_file(self, identifier, name, publication_id=None):
        publication = self.queries.publication(identifier, publication_id)
        if publication is None:
            raise FileNotFoundError("Publication not found")
        data, entry = published_bytes(self.storage, publication, publication["sha256"], name)
        return data, entry, publication

    def asset(self, identifier, name, publication_id=None):
        if PurePosixPath(name).suffix.lower() not in RASTER_SUFFIXES:
            raise ValueError("Unsupported figure format")
        return self.published_file(identifier, "assets/" + name, publication_id)

    def readiness(self):
        from brh_core.corpus.publication import bundle_prefix, canonical_json
        from brh_core.corpus.storage import StorageUnavailable

        counts, latest = self.queries.publication_health()
        storage_ready = False
        if latest:
            try:
                prefix = bundle_prefix(latest["sha256"], latest["publication_id"])
                storage_ready = self.storage.backend == latest["storage_backend"] and (
                    self.storage.read(prefix + "/manifest.json")
                    == canonical_json(latest["manifest"])
                )
            except StorageUnavailable:
                pass
        ready = counts["documents"] == counts["published_documents"] and storage_ready
        return {
            "ready": ready,
            "database": True,
            "artifact_storage": storage_ready,
            **counts,
            "unpublished_documents": counts["documents"] - counts["published_documents"],
        }

    def neighborhood(self, entity_id, **kwargs):
        result = self.graph.neighborhood(entity_id, **kwargs)
        valid, checked = [], {}
        for edge in result.edges:
            identifier = edge.evidence.document_id
            if identifier not in checked:
                try:
                    document, _ = self.current_document(identifier)
                    checked[identifier] = document.artifact_hash
                except (StaleArtifactError, FileNotFoundError, ValueError):
                    checked[identifier] = False
            if checked[identifier] == edge.evidence.artifact_hash:
                valid.append(edge)
        visible = {entity_id} | {
            node for edge in valid for node in (edge.subject_id, edge.object_id)
        }
        return result.model_copy(
            update={
                "edges": tuple(valid),
                "nodes": tuple(n for n in result.nodes if n.entity_id in visible),
            }
        )

    def graph_passages(self, entity_id, **kwargs):
        graph = self.neighborhood(entity_id, **kwargs)
        evidence = [edge.evidence for edge in graph.edges]
        if not kwargs.get("relationship") and not kwargs.get("kind"):
            evidence.extend(self.graph.mentions(entity_id))
        unique = {}
        for item in evidence:
            try:
                document, _ = self.current_document(item.document_id)
            except (StaleArtifactError, FileNotFoundError, ValueError):
                continue
            if kwargs.get("family") and document.family != kwargs["family"]:
                continue
            if item.artifact_hash != document.artifact_hash:
                continue
            if kwargs.get("year") and kwargs["year"] not in document.period_years:
                continue
            unique.setdefault((item.document_id, item.page_number, item.quote), item)
        return {
            "items": list(unique.values())[:100],
            "truncated": graph.truncated or len(unique) > 100,
        }
