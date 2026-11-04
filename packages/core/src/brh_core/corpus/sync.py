"""Import completed Markdown artifacts without running embeddings."""

import logging
from concurrent.futures import ThreadPoolExecutor

from brh_core.corpus.artifacts import ArtifactStore, artifact_hash, official_pdf
from brh_core.corpus.metadata import clean_title, covered_period, family_for, reading_title
from brh_core.corpus.publication import build_bundle
from brh_core.ingestion.artifacts import IncompleteOcrArtifact, discover_ocr_markdown
from brh_core.ingestion.extract import InvalidOcrArtifact
from brh_core.ingestion.metadata import document_id_for_sha256, slugify

logger = logging.getLogger(__name__)


def _sync_one(path, store, repository, storage) -> tuple[str, bool]:
    """Sync one artifact; return its count bucket and whether it changed."""
    try:
        with repository.lock(path.parent.name):
            artifact = store.document(path.parent.name)
            pages = artifact.read_pages()
            if not any(page.text.strip() for page in pages):
                return "deferred", False
            source = repository.source(artifact.sha256)
            record = project_artifact(artifact, source)
            bundle = build_bundle(artifact, record["title"])
            bundle.publish(storage)
            # Do not promote an artifact replaced while its bundle was uploaded.
            if (
                build_bundle(store.document(artifact.sha256), record["title"]).publication_id
                != bundle.publication_id
            ):
                return "deferred", False
            changed = repository.save(
                record,
                {page.page_number: page.text for page in pages},
                {
                    "publication_id": bundle.publication_id,
                    "storage_backend": storage.backend,
                    "manifest": bundle.manifest,
                },
            )
            return "documents", int(changed)
    except IncompleteOcrArtifact:
        return "deferred", False
    except (InvalidOcrArtifact, ValueError, OSError):
        logger.warning("Invalid research artifact %s", path.parent.name, exc_info=True)
        return "failed", False


def sync_artifacts(root, repository, storage, workers: int = 1) -> dict[str, int]:
    """Import artifacts, optionally syncing independent documents concurrently."""
    counts = {"documents": 0, "changed": 0, "deferred": 0, "failed": 0}
    store = ArtifactStore(root)
    paths = list(discover_ocr_markdown(root))

    def run(path):
        return _sync_one(path, store, repository, storage)

    if workers > 1:
        with ThreadPoolExecutor(max_workers=workers) as executor:
            results = executor.map(run, paths)
            for bucket, changed in results:
                counts[bucket] += 1
                counts["changed"] += int(changed)
    else:
        for path in paths:
            bucket, changed = run(path)
            counts[bucket] += 1
            counts["changed"] += int(changed)
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
