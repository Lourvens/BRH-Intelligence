"""Colab chunk runner: one document at a time, under a hard time cap.

A single pathological document has stalled a whole chunk twice now (one took
~25 minutes legitimately, another never finished). `brh_core` has no per-document
timeout — a hang blocks the batch forever — so the isolation lives here: each
document gets its own `timeout`, its own manifest and its own process. A kill
costs that document, not the chunk.
"""

import json
import os
import subprocess
import sys

ROOT = "/content/repo"
OUT = "/content/out"
DONE = f"{ROOT}/data/ocr/done_shas.txt"
LIMIT_DOCS = int(os.environ.get("LIMIT_DOCS", "12"))
PER_DOC_SECONDS = int(os.environ.get("PER_DOC_SECONDS", "2400"))  # 40 min

env = dict(os.environ, PYTHONPATH=f"{ROOT}/packages/core/src")


def already_done() -> set[str]:
    """The skip list as of the last pull, re-read before every document.

    Shards are cut over URLs, so two runners can be handed the same document
    under different URLs. The list is a snapshot, and a chunk lives for hours:
    a Kaggle version finishing mid-chunk would otherwise be re-OCRed here.
    """
    try:
        with open(DONE, encoding="utf-8") as handle:
            return {line.strip() for line in handle if line.strip()}
    except FileNotFoundError:
        return set()


def run(command, **kwargs):
    print("$", " ".join(command), flush=True)
    return subprocess.run(command, cwd=ROOT, env=env, **kwargs)


def main() -> None:
    run([sys.executable, "scripts/fetch_shard.py", "--urls", "data/ocr/urls.jsonl",
         "--shard", "1/4", "--out-dir", "/content/pdfs", "--manifest", "/content/m.jsonl",
         "--limit", str(LIMIT_DOCS), "--skip-shas", "data/ocr/done_shas.txt"])

    with open("/content/m.jsonl", encoding="utf-8") as handle:
        rows = [json.loads(line) for line in handle if line.strip()]
    print(f"{len(rows)} document(s) to process", flush=True)

    timed_out = []
    for number, row in enumerate(rows, 1):
        if row["sha256"] in already_done():
            print(f"[{number}/{len(rows)}] {row['sha256'][:8]} skipped: done elsewhere", flush=True)
            continue
        one = "/content/one.jsonl"
        with open(one, "w") as handle:
            handle.write(json.dumps(row) + "\n")
        print(f"[{number}/{len(rows)}] {row['sha256'][:8]}", flush=True)
        result = run(["timeout", str(PER_DOC_SECONDS), sys.executable, "-m",
                      "brh_core.ingestion.ocr", "run", "--manifest", one,
                      "--out", OUT, "--attn", "eager"])
        if result.returncode == 124:
            timed_out.append(row["sha256"])
            print(f"  TIMED OUT after {PER_DOC_SECONDS}s", flush=True)

    if timed_out:
        with open("/content/timed_out.txt", "w") as handle:
            handle.write("\n".join(timed_out) + "\n")
        print(f"{len(timed_out)} document(s) hit the per-document cap", flush=True)


if __name__ == "__main__":
    main()
