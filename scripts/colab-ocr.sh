#!/usr/bin/env bash
# Batch-OCR a directory of PDFs — on Colab (no local GPU needed) or anywhere else.
#
#   bash scripts/colab-ocr.sh <pdf-dir> <out-dir> [extra args for `run`]
#
# Examples
#   bash scripts/colab-ocr.sh data/raw/web data/ocr
#   bash scripts/colab-ocr.sh data/raw/web data/ocr --retry-failed
#   DEVICE=cpu bash scripts/colab-ocr.sh data/raw/web data/ocr
#
# On Colab, point <out-dir> at Google Drive so a disconnect cannot lose finished
# documents — the VM's /content is erased, Drive is not:
#
#   from google.colab import drive; drive.mount("/content/drive")
#   bash scripts/colab-ocr.sh data/raw/web /content/drive/MyDrive/brh-ocr/ocr
#
# Two machines can work one corpus without duplicate work by taking different
# shards. The split is a pure function of manifest order, so it needs no lock:
#
#   SHARD=0/2 bash scripts/colab-ocr.sh ...   # even documents
#   SHARD=1/2 bash scripts/colab-ocr.sh ...   # odd documents
#
# MAX_PAGES bounds a session (a document is never split); with output on Drive
# the loss on a disconnect is one document, so 100 pages is a safe chunk.
#
# The OCR stage needs the corpus package, not the corpus database: brh_core is
# put on PYTHONPATH instead of installed, so Postgres and Pinecone stay out of
# the environment. Re-running the same command resumes — completed documents are
# skipped, failed ones only retry with `--retry-failed`.

set -euo pipefail

PDF_DIR="${1:?usage: colab-ocr.sh <pdf-dir> <out-dir> [run args...]}"
OUT_DIR="${2:?usage: colab-ocr.sh <pdf-dir> <out-dir> [run args...]}"
shift 2 || true

DEVICE="${DEVICE:-}"
SHARD="${SHARD:-}"
MAX_PAGES="${MAX_PAGES:-}"

echo "== installing the OCR stack (skip this line if it is already there)"
python -m pip install -q -U "paddleocr[doc-parser]" "transformers>=5.0.0" \
    pydantic pydantic-settings python-dotenv

echo "== putting brh_core on the path"
export PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}"
python -c "import brh_core.ingestion.ocr as m; print('  brh_core ok:', m.__name__)"

echo "== manifest"
mkdir -p "$OUT_DIR"
if [ -n "${URLS:-}" ]; then
    echo "  fetching shard $SHARD from $URLS"
    python scripts/fetch_shard.py --urls "$URLS" --shard "${SHARD:-0/1}" \
        --out-dir "$PDF_DIR" --manifest "$OUT_DIR/manifest.jsonl" \
        --limit "${LIMIT:-0}"
fi
if [ -n "${MANIFEST:-}" ]; then
    echo "  using $MANIFEST"
else
    MANIFEST="$OUT_DIR/manifest.jsonl"
    python -m brh_core.ingestion.ocr manifest --from-dir "$PDF_DIR" --out "$MANIFEST"
fi

EXTRA=()
if [ -n "$SHARD" ]; then
    EXTRA+=(--shard "$SHARD")
    echo "== shard $SHARD"
fi
if [ -n "$MAX_PAGES" ]; then
    EXTRA+=(--max-pages "$MAX_PAGES")
    echo "== page budget $MAX_PAGES"
fi

echo "== batch"
python -m brh_core.ingestion.ocr run \
    --manifest "$MANIFEST" \
    --out "$OUT_DIR" \
    ${DEVICE:+--device "$DEVICE"} \
    "${EXTRA[@]}" \
    "$@"

echo "== status"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR"

if [[ "$OUT_DIR" == /content/drive/* ]]; then
    echo "== output is on Drive: finished documents survive a disconnect"
fi
