"""Download one shard's PDFs from the catalogue, then build a manifest for it.

Used by the Colab and Kaggle runners, where the PDFs must never come from the
machine that dispatched the batch:

    python scripts/fetch_shard.py --shard 2/4 --out-dir /content/pdfs \
        --manifest /content/manifest.jsonl

`--dry-run` prints what would be fetched and downloads nothing, which is how the
shard split gets checked before a session spends its time on bytes.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from brh_core.ingestion.fetch import NotAPdf, fetch_pdf
from brh_core.ingestion.ocr import ManifestItem, write_manifest


def parse_shard(value: str) -> tuple[int, int]:
    index, total = (int(part) for part in value.split("/", 1))
    if total < 1 or not 0 <= index < total:
        raise SystemExit(f"--shard {value}: need 0 <= I < N")
    return index, total


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Fetch one shard of the corpus.")
    parser.add_argument("--urls", default=Path("data/ocr/urls.jsonl"), type=Path)
    parser.add_argument("--shard", default="0/1")
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--skip-shas", default=None, type=Path,
                        help="One sha256 per line; those documents are fetched and dropped.")
    parser.add_argument("--skip-urls", default=None, type=Path,
                        help="One URL per line; filtered out before downloading.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args(argv)

    index, total = parse_shard(args.shard)
    rows = [json.loads(line) for line in args.urls.read_text().splitlines() if line.strip()]
    shard = rows[index::total]
    if args.skip_urls and args.skip_urls.is_file():
        done_urls = {
            line.strip()
            for line in args.skip_urls.read_text().splitlines()
            if line.strip()
        }
        before = len(shard)
        shard = [row for row in shard if row["url"] not in done_urls]
        print(f"  {before - len(shard)} url(s) already extracted, filtered before download")
    # No pre-truncation here: `--limit` means *new* documents, and whether a
    # document is new is only known after fetching and hashing it. Truncating
    # first made a chunk refetch the same already-done URLs and deliver nothing.

    print(f"shard {index}/{total}: {len(shard)} url(s)")
    if args.dry_run:
        for row in shard[:10]:
            print(f"  {row['url']}")
        if len(shard) > 10:
            print(f"  ... and {len(shard) - 10} more")
        return 0

    args.out_dir.mkdir(parents=True, exist_ok=True)
    skip: set[str] = set()
    if args.skip_shas and args.skip_shas.is_file():
        skip = {line.strip() for line in args.skip_shas.read_text().splitlines() if line.strip()}
        print(f"  skipping {len(skip)} already-extracted document(s)")

    failures = skipped = 0
    items: list[ManifestItem] = []
    for number, row in enumerate(shard, 1):
        if args.limit and len(items) >= args.limit:
            print(f"  reached the {args.limit}-document limit")
            break
        try:
            digest, path = fetch_pdf(row["url"], args.out_dir)
            if digest in skip:
                # The bytes told us this document already exists somewhere else.
                path.unlink(missing_ok=True)
                skipped += 1
                print(f"  [{number}/{len(shard)}] {digest[:8]} already extracted", flush=True)
                continue
            items.append(ManifestItem(sha256=digest, path=path))
            print(f"  [{number}/{len(shard)}] {digest[:8]} {path.stat().st_size // 1024} kB",
                  flush=True)
        except NotAPdf as error:
            failures += 1
            print(f"  [{number}/{len(shard)}] not a pdf: {error}", flush=True)
        except Exception as error:
            failures += 1
            print(f"  [{number}/{len(shard)}] failed: {type(error).__name__}: {error}", flush=True)

    write_manifest(items, args.manifest)
    print(f"manifest {args.manifest}: {len(items)} document(s), "
          f"{skipped} already extracted, {failures} fetch failure(s)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
