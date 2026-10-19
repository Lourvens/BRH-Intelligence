"""Export the catalogue's outstanding PDF URLs, so runners can fetch their own shard.

Nothing is downloaded here. The inventory already enumerated brh.ht
(`corpus.crawl_urls`); this reads it and writes one line per document still
missing from the extracted corpus:

    uv run python scripts/export_urls.py                     # data/ocr/urls.jsonl
    uv run python scripts/export_urls.py --include-done      # everything, for reruns

Each row is ``{url, title, year, bytes, sha256}``. ``sha256`` is only known for
documents already downloaded; for the rest the runner computes it after fetching,
which is why the shards are cut over URL order and not over hashes.

`year` and `bytes` let the planner balance shards by expected work instead of by
document count.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import psycopg
from brh_core.config import get_settings


def dsn() -> str:
    settings = get_settings()
    password = settings.postgres_password.get_secret_value()
    return (
        f"postgresql://{settings.postgres_user}:{password}"
        f"@{settings.postgres_host}:{settings.postgres_port}/{settings.postgres_db}"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Export outstanding PDF URLs from the catalogue.")
    parser.add_argument("--out", default=Path("data/ocr/urls.jsonl"), type=Path)
    parser.add_argument("--include-done", action="store_true",
                        help="Include URLs whose document is already extracted.")
    args = parser.parse_args(argv)

    query = """
        SELECT url, title, wp_date, content_length, sha256
        FROM corpus.crawl_urls
        WHERE status IN ('pending', 'unchanged', 'downloaded')
        ORDER BY wp_date NULLS LAST, url
    """
    rows = []
    with psycopg.connect(dsn()) as connection, connection.cursor() as cursor:
        cursor.execute(query)
        for url, title, published, size, sha256 in cursor:
            rows.append({
                "url": url,
                "title": (title or "")[:200],
                "year": published.year if published else None,
                "bytes": size,
                "sha256": sha256.strip() if sha256 else None,
            })

    done = {row["sha256"] for row in rows if row["sha256"]}
    if not args.include_done:
        rows = [row for row in rows if not row["sha256"]]

    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")

    known_bytes = sum(row["bytes"] or 0 for row in rows)
    print(f"{len(rows)} url(s) -> {args.out}"
          f"  ({known_bytes / 1024 / 1024:.0f} MB where content-length is known)")
    print(f"  already downloaded: {len(done)} (excluded)"
          if not args.include_done else f"  already downloaded: {len(done)} (included)")
    years: dict[int, int] = {}
    for row in rows:
        if row["year"]:
            years[row["year"]] = years.get(row["year"], 0) + 1
    if years:
        print("  by year:", "  ".join(f"{year}:{count}" for year, count in sorted(years.items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
