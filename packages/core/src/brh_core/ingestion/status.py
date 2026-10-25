"""Report verified backfill coverage without making embedding requests."""

import json

from brh_core.config import get_settings
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.pipeline import embed_id, target_id
from brh_core.vectorstore.factory import build_vector_store


def backfill_status(settings, repository, store):
    report = repository.index_progress(target_id(settings, store), embed_id(settings))
    report["remote_vectors"] = store.count()
    report["model"] = settings.embedding_model
    path = settings.resolved_processed_dir / "qwen-backfill-snapshot.json"
    if path.exists():
        snapshot = json.loads(path.read_text())
        documents = snapshot["documents"]
        report["initial_artifacts"] = len(documents)
        report["initial_ready_documents"] = sum(item["status"] == "ready" for item in documents)
        report["initial_deferred_documents"] = sum(
            item["status"] == "awaiting_text" for item in documents
        )
        report["initial_expected_vectors"] = sum(item["chunks"] for item in documents)
    return report


def main():
    settings = get_settings()
    store = build_vector_store(settings)
    with open_pool(settings) as pool:
        print(json.dumps(backfill_status(settings, CorpusRepository(pool), store)))


if __name__ == "__main__":
    main()
