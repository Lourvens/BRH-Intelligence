"""Import completed Markdown artifacts without running embeddings."""

import logging

from brh_core.corpus.artifacts import ArtifactStore, artifact_hash, official_pdf
from brh_core.corpus.metadata import clean_title, covered_period, family_for, reading_title
from brh_core.corpus.publication import build_bundle
from brh_core.ingestion.artifacts import IncompleteOcrArtifact, discover_ocr_markdown
from brh_core.ingestion.extract import InvalidOcrArtifact
from brh_core.ingestion.metadata import document_id_for_sha256, slugify

logger = logging.getLogger(__name__)


def sync_artifacts(root, repository, storage) -> dict[str, int]:
    counts = {"documents": 0, "changed": 0, "deferred": 0, "failed": 0}
    store = ArtifactStore(root)
    for path in discover_ocr_markdown(root):
        try:
            with repository.lock(path.parent.name):
                artifact = store.document(path.parent.name)
                pages = artifact.read_pages()
                if not any(page.text.strip() for page in pages):
                    counts["deferred"] += 1
                    continue
                source = repository.source(artifact.sha256)
                record = project_artifact(artifact, source)
                bundle = build_bundle(artifact, record["title"])
                bundle.publish(storage)
                # Do not promote an artifact replaced while its bundle was uploaded.
                if (
                    build_bundle(store.document(artifact.sha256), record["title"]).publication_id
                    != bundle.publication_id
                ):
                    counts["deferred"] += 1
                    continue
                changed = repository.save(
                    record,
                    {page.page_number: page.text for page in pages},
                    {
                        "publication_id": bundle.publication_id,
                        "storage_backend": storage.backend,
                        "manifest": bundle.manifest,
                    },
                )
                counts["documents"] += 1
                counts["changed"] += int(changed)
        except IncompleteOcrArtifact:
            counts["deferred"] += 1
        except (InvalidOcrArtifact, ValueError, OSError):
            counts["failed"] += 1
            logger.warning("Invalid research artifact %s", path.parent.name, exc_info=True)
    return counts


def project_artifact(artifact, source: dict) -> dict:
    canonical = source.get("document") or {}
    aliases = source.get("aliases") or []
    sha = artifact.sha256
    markdown = artifact.markdown.read_text(encoding="utf-8")
    title = next((valid for a in aliases if (valid := clean_title(a.get("title")))), None)
    title = title or clean_title(artifact.metadata.get("title"))
    title = title or clean_title(canonical.get("title"))
    title = title or reading_title(markdown, f"Document BRH {sha[:8]}")
    period, years = covered_period(title, markdown)
    urls = [a["url"] for a in aliases] + [
        canonical.get("source_url"),
        artifact.metadata.get("source_url"),
    ]
    dates = [a["wp_date"] for a in aliases if a.get("wp_date")]
    return {
        "document_id": str(canonical.get("document_id") or document_id_for_sha256(sha)),
        "sha256": sha,
        "artifact_hash": artifact_hash(artifact.markdown),
        "slug": canonical.get("slug") or f"{slugify(title)[:100]}-{sha[:12]}",
        "title": title,
        "family": family_for(title),
        "period_label": period,
        "period_years": years,
        "uploaded_at": min(dates) if dates else None,
        "source_urls": sorted({valid for url in urls if (valid := official_pdf(url))}),
        "page_count": artifact.metadata["pages"],
        "figure_count": artifact.metadata.get("figures", 0),
        "metadata": {
            key: artifact.metadata.get(key) for key in ("engine", "engine_version", "finished_at")
        },
    }
