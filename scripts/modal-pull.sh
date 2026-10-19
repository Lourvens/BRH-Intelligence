#!/usr/bin/env bash
# Pull OCR output from the Modal volume and reconcile the local corpus.
#
#   bash scripts/modal-pull.sh [dest] [--clean]
#
# Downloads /ocr from the `brh-ocr` volume into `dest` (default data/ocr), then
# merges with scripts/merge_ocr.py: new documents are copied, finished ones are
# left alone, conflicting bytes are reported rather than overwritten, and ledger
# events are unioned. `--clean` drops the volume's per-document ledger directory
# locally afterwards; the documents themselves are never removed.

set -euo pipefail

DEST="${1:-data/ocr}"
CLEAN="${2:-}"

echo "== downloading /ocr from the brh-ocr volume"
# `modal volume get <vol> /ocr <local>` creates <local>/ocr/..., so stage then merge
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
modal volume get brh-ocr /ocr "$STAGE" --force

echo "== merging into $DEST"
uv run python scripts/merge_ocr.py --from "$STAGE/ocr" --into "$DEST"

# per-document ledgers are the volume's write-ahead log; state.jsonl is the merge
if [ -d "$STAGE/ocr/_ledger" ]; then
    echo "== ledger files seen: $(find "$STAGE/ocr/_ledger" -name '*.jsonl' | wc -l)"
fi

if [ "$CLEAN" = "--clean" ]; then
    echo "== cleaning local ledger scratch"
    rm -rf "$DEST/_ledger"
fi

echo "== status"
if command -v uv >/dev/null 2>&1; then
    uv run python -m brh_core.ingestion.ocr status --out "$DEST"
else
    PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}" \
        python -m brh_core.ingestion.ocr status --out "$DEST"
fi
