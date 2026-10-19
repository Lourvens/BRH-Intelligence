#!/usr/bin/env bash
# Run two OCR shards on Kaggle's two T4s — one process per GPU.
#
#   URLS=data/ocr/urls.jsonl SHARD0=3/4 SHARD1=4/4 bash scripts/kaggle-ocr.sh <out-dir>
#   SHARD0=3/4 SHARD1=4/4 bash scripts/kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]
#
# Kaggle's "GPU T4 x2" is two separate 16 GB cards, not one pooled device, so the
# useful parallelism is data-parallel: each process owns one card and one shard,
# and each gets its own output directory because a shared state.jsonl would
# interleave lines from two writers.
#
# With URLS set (the real corpus) each GPU fetches only its own shard into its
# own directory and gets its own manifest — so a shard is also the unit of
# download, and nothing lands on the machine that dispatched the batch.
#
# Batches stay under 30 documents: a Kaggle version only commits its output when
# it finishes, so a small batch is what keeps a killed session cheap.

set -euo pipefail

PDF_DIR="${1:?usage: kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]}"
OUT_DIR="${2:?usage: kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]}"
shift 2 || true

SHARD0="${SHARD0:?set SHARD0, e.g. 3/4}"
SHARD1="${SHARD1:?set SHARD1, e.g. 4/4}"
URLS="${URLS:-}"
DTYPE="${DTYPE:-}"
ATTN="${ATTN:-eager}"  # sdpa is rejected by the layout backbone (HGNetV2)
LIMIT="${LIMIT:-0}"

echo "== installing the OCR stack"
python -m pip install -q -U "paddleocr[doc-parser]" "transformers>=5.0.0" \
    pydantic pydantic-settings python-dotenv

export PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}"
python -c "import brh_core.ingestion.ocr as m; print('  brh_core ok:', m.__name__)"
python -c "import torch; print('  gpus:', [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())])"

mkdir -p "$OUT_DIR"

if [ -n "$URLS" ]; then
    echo "== fetching shard $SHARD0 and $SHARD1 from $URLS"
    python scripts/fetch_shard.py --urls "$URLS" --shard "$SHARD0" \
        --out-dir "$OUT_DIR/pdfs0" --manifest "$OUT_DIR/m0.jsonl" --limit "$LIMIT"
    python scripts/fetch_shard.py --urls "$URLS" --shard "$SHARD1" \
        --out-dir "$OUT_DIR/pdfs1" --manifest "$OUT_DIR/m1.jsonl" --limit "$LIMIT"
    MANIFEST0="$OUT_DIR/m0.jsonl"; MANIFEST1="$OUT_DIR/m1.jsonl"
    SHARD_ARG0=(); SHARD_ARG1=()
else
    MANIFEST0="$OUT_DIR/manifest.jsonl"
    if [ ! -f "$MANIFEST0" ]; then
        python -m brh_core.ingestion.ocr manifest --from-dir "$PDF_DIR" --out "$MANIFEST0"
    fi
    MANIFEST1="$MANIFEST0"
    SHARD_ARG0=(--shard "$SHARD0")
    SHARD_ARG1=(--shard "$SHARD1")
fi

common=()
[ -n "$DTYPE" ] && common+=(--dtype "$DTYPE")
[ -n "$ATTN" ] && common+=(--attn "$ATTN")

mkdir -p "$OUT_DIR/gpu0" "$OUT_DIR/gpu1"
echo "== gpu 0 -> $SHARD0, gpu 1 -> $SHARD1"
CUDA_VISIBLE_DEVICES=0 python -m brh_core.ingestion.ocr run \
    --manifest "$MANIFEST0" --out "$OUT_DIR/gpu0" "${SHARD_ARG0[@]}" "${common[@]}" \
    > "$OUT_DIR/gpu0.log" 2>&1 &
PID0=$!
CUDA_VISIBLE_DEVICES=1 python -m brh_core.ingestion.ocr run \
    --manifest "$MANIFEST1" --out "$OUT_DIR/gpu1" "${SHARD_ARG1[@]}" "${common[@]}" \
    > "$OUT_DIR/gpu1.log" 2>&1 &
PID1=$!

wait "$PID0" || echo "gpu0 exited non-zero — see $OUT_DIR/gpu0.log"
wait "$PID1" || echo "gpu1 exited non-zero — see $OUT_DIR/gpu1.log"

echo "== results"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR/gpu0"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR/gpu1"

echo "== merge the two halves"
python scripts/merge_ocr.py --from "$OUT_DIR/gpu1" --into "$OUT_DIR/gpu0"
echo "merged into $OUT_DIR/gpu0"
