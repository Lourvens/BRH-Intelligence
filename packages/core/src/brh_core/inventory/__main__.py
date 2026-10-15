"""Inventory CLI.

Usage::

    python -m brh_core.inventory [--since ISO] [--limit N] [--force] [--dry-run]
                                 [--stats]

Requires the corpus schema (``python -m brh_core.db.migrate``) and a reachable
Postgres per ``.env``.

Every run **resumes** from where the last one stopped (a persisted cursor), so
repeated bounded runs keep making progress::

    make inventory ARGS="--limit 20"   # first 20, then the next 20, ...
    make inventory                     # everything still outstanding (a cron unit)

``--since`` re-scans an explicit time window instead; ``--force`` re-downloads.
"""

from __future__ import annotations

import argparse
import json
import logging
from datetime import UTC, datetime

from brh_core.config import get_settings
from brh_core.db.pool import open_pool
from brh_core.inventory.ledger import InventoryLedger
from brh_core.inventory.pipeline import run_inventory


def _parse_datetime(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="brh_core.inventory",
        description="Discover and download BRH documents from brh.ht into the inventory ledger.",
    )
    parser.add_argument(
        "--since",
        type=_parse_datetime,
        default=None,
        help="Re-scan PDFs modified after this ISO-8601 timestamp (ignores the cursor).",
    )
    parser.add_argument(
        "--limit", type=int, default=None, help="Process at most N documents this run."
    )
    parser.add_argument("--force", action="store_true", help="Re-download from the start.")
    parser.add_argument("--dry-run", action="store_true", help="Decide without writing.")
    parser.add_argument("--stats", action="store_true", help="Print ledger stats and exit.")
    args = parser.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    logging.getLogger("httpx").setLevel(logging.WARNING)
    settings = get_settings()

    pool = open_pool(settings)
    pool.open()
    report = None
    try:
        ledger = InventoryLedger(pool)

        if args.stats:
            print(json.dumps(ledger.stats(), indent=2, default=str))
            return 0

        report = run_inventory(
            settings,
            ledger=ledger,
            since=args.since,
            limit=args.limit,
            force=args.force,
            dry_run=args.dry_run,
        )

        print(
            f"[{report.mode}] discovered={report.discovered} "
            f"downloaded={report.downloaded} duplicated={report.duplicated} "
            f"unchanged={report.unchanged} failed={report.failed} "
            f"bytes={report.bytes_written}"
        )
        for url, error in report.failures:
            print(f"  FAILED {url}: {error}")
    finally:
        pool.close()

    return 1 if report is not None and report.failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
