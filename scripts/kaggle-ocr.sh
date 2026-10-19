#!/usr/bin/env bash
# Run two OCR shards on Kaggle's two T4s — one process per GPU.
#
#   SHARD0=3 SHARD1=4 OF=5 bash scripts/kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]
#
# Kaggle's "GPU T4 x2" is two separate 16 GB cards, not one pooled device, so the
# useful parallelism is data-parallel: each process owns one card and one shard.
# They write to separate output directories (`<out-dir>/gpu0`, `gpu1`) because a
# shared state.jsonl would interleave lines from two writers — merge afterwards
# with scripts/merge_ocr.py.
#
# Each shard must stay under 30 documents: a Kaggle version only commits its
# output when it finishes, so a small batch is what keeps a killed session cheap.
# With a 5-way split over 116 documents each shard is 22-24 documents.
#
# Example for the BRH corpus (shards 3 and 4 of 5):
#   SHARD0=3 SHARD1=4 OF=5 bash scripts/kaggle-ocr.sh data/raw/web /kaggle/working/ocr

set -euo pipefail

PDF_DIR="${1:?usage: kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]}"
OUT_DIR="${2:?usage: kaggle-ocr.sh <pdf-dir> <out-dir> [run args...]}"
shift 2 || true

SHARD0="${SHARD0:?set SHARD0, e.g. 3}"
SHARD1="${SHARD1:?set SHARD1, e.g. 4}"
OF="${OF:-5}"
DTYPE="${DTYPE:-}"
ATTN="${ATTN:-eager}"  # sdpa is rejected by the layout backbone (HGNetV2)
MAX_PIXELS="${MAX_PIXELS:-}"

echo "== installing the OCR stack"
python -m pip install -q -U "paddleocr[doc-parser]" "transformers>=5.0.0" \
    pydantic pydantic-settings python-dotenv

export PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}"
python -c "import brh_core.ingestion.ocr as m; print('  brh_core ok:', m.__name__)"

echo "== gpUs"
python -c "import torch; print(' ', [torch.cuda.get_device_name(i) for i in range(torch.cuda.device_count())])"

mkdir -p "$OUT_DIR/gpu0" "$OUT_DIR/gpu1"
if [ -n "${MANIFEST:-}" ]; then
    echo "== using $MANIFEST"
else
    MANIFEST="$OUT_DIR/manifest.jsonl"
    python -m brh_core.ingestion.ocr manifest --from-dir "$PDF_DIR" --out "$MANIFEST"
fi

common=(--manifest "$MANIFEST")
[ -n "$DTYPE" ] && common+=(--dtype "$DTYPE")
[ -n "$ATTN" ] && common+=(--attn "$ATTN")
common+=("$@")

echo "== shard $SHARD0/$OF on gpu 0, shard $SHARD1/$OF on gpu 1"
# CUDA_VISIBLE_DEVICES does the pinning; passing device=gpu:1 would be wrong,
# because each process only sees one card and it is gpu:0 to PaddleX.
CUDA_VISIBLE_DEVICES=0 python -m brh_core.ingestion.ocr run \
    --out "$OUT_DIR/gpu0" --shard "$SHARD0/$OF" "${common[@]}" \
    > "$OUT_DIR/gpu0.log" 2>&1 &
PID0=$!
CUDA_VISIBLE_DEVICES=1 python -m brh_core.ingestion.ocr run \
    --out "$OUT_DIR/gpu1" --shard "$SHARD1/$OF" "${common[@]}" \
    > "$OUT_DIR/gpu1.log" 2>&1 &
PID1=$!

wait "$PID0" || echo "gpu0 exited non-zero — see $OUT_DIR/gpu0.log"
wait "$PID1" || echo "gpu1 exited non-zero — see $OUT_DIR/gpu1.log"

echo "== results"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR/gpu0"
python -m brh_core.ingestion.ocr status --out "$OUT_DIR/gpu1"

echo "== merge the two halves (documents copied, ledgers unioned)"
python scripts/merge_ocr.py --from "$OUT_DIR/gpu1" --into "$OUT_DIR/gpu0"
echo "merged into $OUT_DIR/gpu0 — pull it with scripts/merge_ocr.py"
