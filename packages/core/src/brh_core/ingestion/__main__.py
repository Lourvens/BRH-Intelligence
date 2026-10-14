"""Ingestion CLI.

Usage::

    python -m brh_core.ingestion [--raw-dir PATH] [--force] [--limit N]

The wiring exists; the pipeline itself is a stub (see
:mod:`brh_core.ingestion.pipeline`). Requires the corpus schema to exist
(``python -m brh_core.db.migrate``) and a reachable Postgres + vector store per
``.env``.
"""

from __future__ import annotations

import argparse
import logging
from pathlib import Path

from brh_core.config import get_settings
from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository
from brh_core.ingestion.pipeline import run_ingestion
from brh_core.vectorstore.factory import build_vector_store


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="brh_core.ingestion",
        description="Discover PDFs in data/raw and ingest them into Postgres + Pinecone.",
    )
    parser.add_argument("--raw-dir", type=Path, default=None, help="Override BRH_RAW_DIR.")
    parser.add_argument("--force", action="store_true", help="Re-index even if unchanged.")
    parser.add_argument("--limit", type=int, default=None, help="Process at most N PDFs.")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    settings = get_settings()

    pool = open_pool(settings)
    pool.open()
    try:
        repository = CorpusRepository(pool)
        vector_store = build_vector_store(settings)
        report = run_ingestion(
            settings,
            repository=repository,
            vector_store=vector_store,
            raw_dir=args.raw_dir,
            force=args.force,
            limit=args.limit,
        )

        print(
            f"found={report.documents_found} processed={report.documents_processed} "
            f"skipped={report.documents_skipped} pages={report.pages_written} "
            f"chunks={report.chunks_written}"
        )
        for name, error in report.failures:
            print(f"  FAILED {name}: {error}")

        if not report.failures:
            from brh_core.catalog import write_catalog

            print(f"catalog={write_catalog(settings, repository)}")
    finally:
        pool.close()

    return 1 if report.failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
