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
import urllib.request

ROOT = "/content/repo"
OUT = "/content/out"
DONE = f"{ROOT}/data/ocr/done_shas.txt"
# The repository is public, so the skip list is already published by `git push`.
# Reading it costs an outbound GET; a tunnel would only add a way back in.
REMOTE_DONE = (
    "https://raw.githubusercontent.com/Lourvens/BRH-Intelligence/main/data/ocr/done_shas.txt"
)
LIMIT_DOCS = int(os.environ.get("LIMIT_DOCS", "12"))
PER_DOC_SECONDS = int(os.environ.get("PER_DOC_SECONDS", "2400"))  # 40 min

sys.path.insert(0, f"{ROOT}/scripts")

from claims import Claims  # noqa: E402 - the path insert must come first

env = dict(os.environ, PYTHONPATH=f"{ROOT}/packages/core/src")


def remote_done() -> set[str]:
    """The published list, minutes fresh. Silent when the network is down."""
    try:
        with urllib.request.urlopen(REMOTE_DONE, timeout=15) as response:
            return {line.strip() for line in response.read().decode().splitlines() if line.strip()}
    except Exception:  # offline or rate limited: fall back to local
        return set()


def already_done() -> set[str]:
    """Union of the last pull and the published list, before every document.

    Shards are cut over URLs, so two runners can be handed the same document
    under different URLs. A chunk lives for hours, so a Kaggle version landing
    mid-chunk would otherwise be re-OCRed here.
    """
    try:
        with open(DONE, encoding="utf-8") as handle:
            local = {line.strip() for line in handle if line.strip()}
    except FileNotFoundError:
        local = set()
    return local | remote_done()


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

    claims = Claims(runner="colab")
    print(f"claims: {'on' if claims.enabled else 'off (skip list only)'}", flush=True)

    timed_out = []
    for number, row in enumerate(rows, 1):
        if row["sha256"] in already_done():
            print(f"[{number}/{len(rows)}] {row['sha256'][:8]} skipped: done elsewhere", flush=True)
            continue
        if not claims.claim(row["sha256"]):
            print(f"[{number}/{len(rows)}] {row['sha256'][:8]} claimed elsewhere", flush=True)
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
            claims.release(row["sha256"])
            print(f"  TIMED OUT after {PER_DOC_SECONDS}s; claim released", flush=True)
        elif result.returncode != 0:
            claims.release(row["sha256"])
            print(f"  failed with {result.returncode}; claim released", flush=True)

    if timed_out:
        with open("/content/timed_out.txt", "w") as handle:
            handle.write("\n".join(timed_out) + "\n")
        print(f"{len(timed_out)} document(s) hit the per-document cap", flush=True)


if __name__ == "__main__":
    main()
