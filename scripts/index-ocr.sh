#!/usr/bin/env bash
# Consume finished OCR artifacts and pick up later arrivals without rerunning OCR.
set -euo pipefail

brh_index_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$brh_index_root"
mkdir -p data/processed

# One supervisor owns this lock; BRH_INGESTION_WORKERS bounds its document tasks.
exec 9>data/processed/ocr-index.lock
flock -n 9 || { echo "An OCR indexing worker is already running." >&2; exit 1; }

# This workspace has exhausted its trace quota. Keep durable DB/local metrics;
# allow an explicit BRH_INDEX_TRACING=true when trace capacity is available.
export LANGSMITH_TRACING="${BRH_INDEX_TRACING:-false}"
export LANGCHAIN_TRACING_V2="$LANGSMITH_TRACING"

exec uv run python -u -m brh_core.ingestion \
  --from-ocr --index --limit 20 --watch 30 \
  >>data/processed/ocr-index.log 2>&1
