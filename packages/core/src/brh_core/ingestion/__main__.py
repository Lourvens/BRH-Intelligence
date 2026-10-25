"""CLI for discovery through verified indexing, with repeatable watch cycles."""

from __future__ import annotations

import argparse
import json
import logging
import signal
from dataclasses import asdict
from pathlib import Path
from threading import Event

from dotenv import load_dotenv

from brh_core.config import VectorBackend, get_settings
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.pipeline import reconcile_corpus
from brh_core.ingestion.workflow import build_ingestion_workflow
from brh_core.inventory.ledger import InventoryLedger
from brh_core.vectorstore.factory import build_vector_store


def _positive(value):
    number = int(value)
    if number <= 0:
        raise argparse.ArgumentTypeError("must be positive")
    return number


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Resume discovery, extraction and verified indexing."
    )
    parser.add_argument("--raw-dir", type=Path)
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=_positive, help="Maximum successful documents per cycle.")
    parser.add_argument("--index", action="store_true")
    parser.add_argument("--workers", type=_positive, help="Maximum concurrent documents.")
    parser.add_argument(
        "--reset-derived",
        action="store_true",
        help="Reset old derivatives once and exit; stop the worker first.",
    )
    parser.add_argument("--reset-from-index", default="brh-intelligence")
    parser.add_argument("--reset-from-namespace", default="default")
    parser.add_argument(
        "--from-ocr",
        action="store_true",
        help="Start from completed OCR artifacts; no local PDF or fallback extraction.",
    )
    parser.add_argument(
        "--discover", action="store_true", help="Discover/download BRH media first."
    )
    parser.add_argument("--download-limit", type=_positive)
    parser.add_argument("--migrate", action="store_true", help="Apply pending database migrations.")
    parser.add_argument(
        "--provision-index",
        action="store_true",
        help="Create the configured Pinecone hosted-model index if absent.",
    )
    parser.add_argument("--cloud", default="aws")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument(
        "--reconcile",
        action="store_true",
        help="Recheck remote records even when the manifest succeeded.",
    )
    parser.add_argument(
        "--watch",
        type=_positive,
        metavar="SECONDS",
        help="Repeat discovery/ingestion; newly arrived OCR is picked up each cycle.",
    )
    parser.add_argument(
        "--tokenizer-model",
        help="Exact local tokenizer override for non-Pinecone/offline indexing.",
    )
    args = parser.parse_args(argv)
    load_dotenv()
    if args.reconcile or args.provision_index or args.reset_derived:
        args.index = True
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("pinecone").setLevel(logging.WARNING)
    settings = get_settings()
    if args.index and settings.vector_backend is not VectorBackend.memory:
        settings.validate_chunk_limits()
        if not args.reset_derived:
            from brh_core.ingestion.reset import ensure_reset_complete

            ensure_reset_complete(settings.resolved_processed_dir / "qwen-reset.json")
    if args.migrate:
        from brh_core.db.migrate import apply_migrations

        apply_migrations(settings)
    if args.provision_index:
        from brh_core.vectorstore.provision import provision_index

        provision_index(settings, cloud=args.cloud, region=args.region)
    vector_store = build_vector_store(settings) if args.index else None
    tokenizer_id = count_tokens = None
    if args.index and settings.vector_backend in (
        VectorBackend.pinecone_integrated,
        VectorBackend.pinecone,
    ):
        from brh_core.ingestion.tokenizer import production_counter

        tokenizer_id, count_tokens = production_counter(settings)
    elif args.tokenizer_model:
        from brh_core.ingestion.chunking.tokens import huggingface_counter

        tokenizer_id, count_tokens = huggingface_counter(args.tokenizer_model)
    pool = open_pool(settings)
    stop = Event()
    previous_handlers = {}
    for signum in (signal.SIGTERM, signal.SIGINT):
        previous_handlers[signum] = signal.signal(signum, lambda *_: stop.set())
    try:
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        if args.reset_derived:
            from brh_core.ingestion.reset import reset_derived
            from brh_core.vectorstore.pinecone_integrated import PineconeIntegratedVectorStore

            old_store = PineconeIntegratedVectorStore(
                api_key=settings.pinecone_api_key.get_secret_value(),
                index_name=args.reset_from_index,
                namespace=args.reset_from_namespace,
            )
            state = reset_derived(
                repository,
                old_store,
                manifest_path=settings.resolved_processed_dir / "qwen-reset.json",
                new_target=vector_store.target_id,
            )
            print(
                json.dumps(
                    {
                        "stage": "reset",
                        "status": state["status"],
                        "documents": len(state["completed"]),
                    }
                )
            )
            return 0
        workflow = build_ingestion_workflow(
            settings,
            repository=repository,
            vector_store=vector_store,
            count_tokens=count_tokens,
            tokenizer_id=tokenizer_id,
            inventory_ledger=InventoryLedger(pool),
            stop=stop,
        )
        while not stop.is_set():
            result = workflow.invoke(
                {
                    "discover": args.discover,
                    "download_limit": args.download_limit,
                    "raw_dir": args.raw_dir,
                    "force": args.force,
                    "limit": args.limit,
                    "reconcile": args.reconcile,
                    "from_ocr": args.from_ocr,
                    "workers": args.workers,
                }
            )
            inventory = result["inventory"]
            discovery_failed = bool(result["discovery_error"])
            if inventory is not None:
                discovery_failed = discovery_failed or bool(inventory.failed)
                print(json.dumps({"stage": "discovery", **asdict(inventory)}, default=str))
            if result["discovery_error"]:
                print(json.dumps({"stage": "discovery", "error": result["discovery_error"]}))
            report = result["ingestion"]
            print(json.dumps({"stage": "ingestion", **asdict(report)}, ensure_ascii=False))
            if vector_store is not None and hasattr(repository, "index_progress"):
                from brh_core.ingestion.status import backfill_status

                try:
                    progress = backfill_status(settings, repository, vector_store)
                    print(json.dumps({"stage": "backfill_progress", **progress}))
                    path = settings.resolved_processed_dir / "ocr-index-status.json"
                    path.parent.mkdir(parents=True, exist_ok=True)
                    temporary = path.with_suffix(".tmp")
                    temporary.write_text(json.dumps(progress))
                    temporary.replace(path)
                except Exception as exc:
                    logging.warning("Progress report unavailable (%s)", type(exc).__name__)
            embedder = getattr(vector_store, "_embedder", None)
            if embedder is not None and hasattr(embedder, "metrics"):
                print(json.dumps({"stage": "embedding_usage", **embedder.metrics}))
            reconciliation_failed = False
            if args.reconcile:
                repaired = reconcile_corpus(
                    settings,
                    repository=repository,
                    vector_store=vector_store,
                    count_tokens=count_tokens,
                    tokenizer_id=tokenizer_id,
                    limit=args.limit,
                )
                reconciliation_failed = bool(repaired.failures)
                print(json.dumps({"stage": "reconciliation", **asdict(repaired)}))
            from brh_core.catalog import write_catalog

            write_catalog(settings, repository)
            if not args.watch:
                return int(bool(report.failures) or discovery_failed or reconciliation_failed)
            if args.limit is None or report.documents_processed < args.limit:
                stop.wait(args.watch)
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        from brh_core.embeddings.errors import EmbeddingBlockedError

        if not isinstance(exc, EmbeddingBlockedError):
            raise
        logging.error("%s", exc)
        return 2
    finally:
        pool.close()
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)


if __name__ == "__main__":
    raise SystemExit(main())
