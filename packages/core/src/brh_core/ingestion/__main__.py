"""CLI for discovery through verified indexing, with repeatable watch cycles."""

from __future__ import annotations

import argparse
import json
import logging
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
    if args.reconcile or args.provision_index:
        args.index = True
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    settings = get_settings()
    if args.migrate:
        from brh_core.db.migrate import apply_migrations

        apply_migrations(settings)
    if args.provision_index:
        from brh_core.vectorstore.provision import provision_index

        provision_index(settings, cloud=args.cloud, region=args.region)
    vector_store = build_vector_store(settings) if args.index else None
    tokenizer_id = count_tokens = None
    if args.index and settings.vector_backend is VectorBackend.pinecone_integrated:
        from brh_core.ingestion.tokenizer import production_counter

        tokenizer_id, count_tokens = production_counter(settings)
    elif args.tokenizer_model:
        from brh_core.ingestion.chunking.tokens import huggingface_counter

        tokenizer_id, count_tokens = huggingface_counter(args.tokenizer_model)
    pool = open_pool(settings)
    stop = Event()
    try:
        pool.open(wait=True)
        repository = CorpusRepository(pool)
        workflow = build_ingestion_workflow(
            settings,
            repository=repository,
            vector_store=vector_store,
            count_tokens=count_tokens,
            tokenizer_id=tokenizer_id,
            inventory_ledger=InventoryLedger(pool),
        )
        while True:
            result = workflow.invoke(
                {
                    "discover": args.discover,
                    "download_limit": args.download_limit,
                    "raw_dir": args.raw_dir,
                    "force": args.force,
                    "limit": args.limit,
                    "reconcile": args.reconcile,
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
            stop.wait(args.watch)
    except KeyboardInterrupt:
        return 130
    finally:
        pool.close()


if __name__ == "__main__":
    raise SystemExit(main())
