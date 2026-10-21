"""One GPU, one manifest, one document at a time, with a claim per document.

Kaggle's kernel used to hand a whole manifest to the batch runner, which picked
documents itself. That makes the skip list the only guard against duplicating
another runner's work, and the list is a snapshot taken when the kernel starts —
hours before it finishes.

Claiming per document closes that window: the worker asks the shared claim table
for the document it is about to OCR, and moves on when someone else owns it.

    CUDA_VISIBLE_DEVICES=0 python scripts/gpu_worker.py \
        --manifest m0.jsonl --out out0 --runner kaggle-gpu0
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from claims import Claims  # noqa: E402 - the path insert must come first


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--runner", default="kaggle")
    parser.add_argument("--timeout", type=int, default=2400, help="seconds per document")
    args = parser.parse_args(argv)

    rows = [
        json.loads(line)
        for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    claims = Claims(runner=args.runner)
    print(f"{len(rows)} document(s), claims {'on' if claims.enabled else 'off'}", flush=True)

    one = args.manifest.with_suffix(".one.jsonl")
    for number, row in enumerate(rows, 1):
        sha = row["sha256"]
        if not claims.claim(sha):
            print(f"[{number}/{len(rows)}] {sha[:8]} claimed elsewhere", flush=True)
            continue

        one.write_text(json.dumps(row) + "\n", encoding="utf-8")
        print(f"[{number}/{len(rows)}] {sha[:8]}", flush=True)
        result = subprocess.run(
            [
                "timeout", str(args.timeout),
                sys.executable, "-m", "brh_core.ingestion.ocr", "run",
                "--manifest", str(one), "--out", str(args.out), "--attn", "eager",
            ],
            check=False,
        )
        if result.returncode != 0:
            # Timeout or crash: hand the document back rather than hold it for
            # the whole TTL while the other runner could be making progress.
            claims.release(sha)
            print(f"  failed with {result.returncode}; claim released", flush=True)

    return 0


if __name__ == "__main__":
    sys.exit(main())
