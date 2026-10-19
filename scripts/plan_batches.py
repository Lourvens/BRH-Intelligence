"""Turn a manifest into a three-platform batch plan.

    uv run python scripts/plan_batches.py --shards 4 --emit data/ocr/batches

Prints, per shard, how many documents and pages it holds and which runner should
take it, then the exact commands. Three rules are checked rather than assumed:

* Colab and Kaggle batches stay under 30 documents: their sessions are lost
  whole, so a small batch is what keeps a disconnect cheap;
* Modal containers stay at or under a 50-page budget, so a longer document is
  reported (it has to run alone — splitting it would break one file per document);
* shards are balanced by **pages**, not document count. Documents range from 1 to
  67 pages; in manifest order a 5-way split gave one worker 373 pages and another
  148, and a wave waits on its slowest worker, so that imbalance is pure wall
  time. Sorting by size first and dealing round-robin brings the spread to 14%.

`--emit` writes that page-sorted manifest. The order is all that changes — same
documents, same hashes — so every runner slices it with `--shard I/N` exactly as
before and the sets stay disjoint.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import pymupdf

MAX_PAGES_PER_CONTAINER = 50
FREE_DOC_CEILING = 30  # Colab/Kaggle: a lost session must be cheap


def page_count(path: Path) -> int:
    try:
        with pymupdf.open(path) as document:
            return document.page_count
    except Exception:
        # A broken PDF is the runner's problem; the planner only needs a size.
        return 0


def load(manifest: Path) -> list[dict]:
    rows = []
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        row["pages"] = page_count(Path(row["path"]))
        rows.append(row)
    return rows


def workers_for(shards: int, modal: int, colab: int, kaggle: int) -> list[str]:
    workers = ["modal"] * modal + ["colab"] * colab + ["kaggle"] * kaggle
    if len(workers) != shards:
        raise SystemExit(
            f"{shards} shards but {len(workers)} slots "
            f"(modal {modal} + colab {colab} + kaggle {kaggle}); "
            f"kaggle sessions take two shards, one per GPU"
        )
    return workers


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Plan OCR batches across Modal, Colab and Kaggle.")
    parser.add_argument("--manifest", default=Path("data/ocr/manifest.jsonl"), type=Path)
    parser.add_argument("--shards", type=int, default=4)
    parser.add_argument("--modal", type=int, default=1, help="Modal containers (one shard each).")
    parser.add_argument("--colab", type=int, default=1, help="Colab sessions.")
    parser.add_argument("--kaggle", type=int, default=2, help="Kaggle GPUs (two per session).")
    parser.add_argument("--emit", default=None, type=Path, help="Write the balanced manifest here.")
    parser.add_argument("--pdf-dir", default="data/raw/web")
    args = parser.parse_args(argv)

    if not args.manifest.is_file():
        print(f"no manifest at {args.manifest} — run the `manifest` command first")
        return 2

    rows = load(args.manifest)
    workers = workers_for(args.shards, args.modal, args.colab, args.kaggle)
    ordered = sorted(rows, key=lambda row: -row["pages"])
    shards = [ordered[index::args.shards] for index in range(args.shards)]
    total_pages = sum(row["pages"] for row in rows)

    print(f"corpus: {len(rows)} documents, {total_pages} pages")
    print(f"shards: {args.shards} ({args.modal} modal, {args.colab} colab, {args.kaggle} kaggle)\n")
    print(f"{'shard':<7}{'worker':<9}{'docs':>5}{'pages':>7}{'largest':>9}")
    problems = 0
    for index, (worker, shard) in enumerate(zip(workers, shards, strict=True)):
        pages = sum(row["pages"] for row in shard)
        largest = max((row["pages"] for row in shard), default=0)
        print(f"{index}/{args.shards:<5}{worker:<9}{len(shard):>5}{pages:>7}{largest:>9}")
        if worker in {"colab", "kaggle"} and len(shard) > FREE_DOC_CEILING:
            print(f"  ! {len(shard)} documents exceeds the {FREE_DOC_CEILING}-document ceiling "
                  f"for {worker}")
            problems += 1
        if worker == "modal" and largest > MAX_PAGES_PER_CONTAINER:
            print(f"  ! a {largest}-page document exceeds the {MAX_PAGES_PER_CONTAINER}-page "
                  f"container budget and will run alone")

    manifest = args.manifest
    if args.emit:
        args.emit.mkdir(parents=True, exist_ok=True)
        manifest = args.emit / "manifest.balanced.jsonl"
        with manifest.open("w", encoding="utf-8") as handle:
            for row in ordered:
                handle.write(json.dumps({"sha256": row["sha256"], "path": row["path"]}) + "\n")
        print(f"\nemitted {manifest} ({len(ordered)} documents, page-sorted)")

    print("\ncommands")
    for index, worker in enumerate(workers):
        shard = f"{index}/{args.shards}"
        if worker == "modal":
            print(f"  BRH_MANIFEST={manifest} BRH_SHARD={shard} "
                  f"modal run --detach scripts/modal_ocr.py::run")
        elif worker == "colab":
            print(f"  MANIFEST={manifest} SHARD={shard} MAX_PAGES=100 "
                  f"bash scripts/colab-ocr.sh {args.pdf_dir} "
                  f"/content/drive/MyDrive/brh-ocr/ocr")
    kaggle = [index for index, worker in enumerate(workers) if worker == "kaggle"]
    if len(kaggle) == 2:
        print(f"  MANIFEST={manifest} SHARD0={kaggle[0]}/{args.shards} "
              f"SHARD1={kaggle[1]}/{args.shards} OF={args.shards} "
              f"bash scripts/kaggle-ocr.sh {args.pdf_dir} /kaggle/working/ocr")

    print("\nmerge")
    print("  bash scripts/modal-pull.sh data/ocr")
    print("  uv run python scripts/merge_ocr.py --from <colab-or-kaggle-output>")
    print("  uv run python scripts/verify_ocr.py")
    print("  uv run python scripts/purge_ocr.py --apply --ledger")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
