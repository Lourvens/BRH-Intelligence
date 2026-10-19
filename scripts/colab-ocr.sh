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
# The OCR stage needs the corpus package, not the corpus database: brh_core is
# put on PYTHONPATH instead of installed, so Postgres and Pinecone stay out of
# the environment. Re-running the same command resumes — completed documents are
# skipped, failed ones only retry with `--retry-failed`.

set -euo pipefail

PDF_DIR="${1:?usage: colab-ocr.sh <pdf-dir> <out-dir> [run args...]}"
OUT_DIR="${2:?usage: colab-ocr.sh <pdf-dir> <out-dir> [run args...]}"
shift 2 || true

DEVICE="${DEVICE:-}"

echo "== installing the OCR stack (skip this line if it is already there)"
python -m pip install -q -U "paddleocr[doc-parser]" "transformers>=5.0.0" \
    pydantic pydantic-settings python-dotenv

echo "== putting brh_core on the path"
export PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}"
python -c "import brh_core.ingestion.ocr as m; print('  brh_core ok:', m.__name__)"

echo "== manifest"
mkdir -p "$OUT_DIR"
python -m brh_core.ingestion.ocr manifest --from-dir "$PDF_DIR" --out "$OUT_DIR/manifest.jsonl"

echo "== batch"
python -m brh_core.ingestion.ocr run \
    --manifest "$OUT_DIR/manifest.jsonl" \
    --out "$OUT_DIR" \
    ${DEVICE:+--device "$DEVICE"} \
    "$@"

echo "== status"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR"
