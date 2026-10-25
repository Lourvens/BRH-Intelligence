#!/usr/bin/env bash
# Pull a Kaggle kernel's OCR output and merge it into the checkout.
#
#   bash scripts/kaggle-pull.sh <owner/kernel> [dest]
#
# The kernel writes out0/ and out1/ (one per GPU); the notebook already merges
# out1 into out0, but this merges both so a half-finished version still yields
# what it produced. Commits when anything new lands: a kernel's working
# directory is scratch, and the repository is the only copy that survives.

set -euo pipefail

REF="${1:?usage: kaggle-pull.sh <owner/kernel> [dest]}"
DEST="${2:-data/ocr}"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# The CLI's `kernels output` resets the connection on this kernel (the server
# closes mid-stream), and when it does answer it can fall back to downloading
# the manifests only. The REST endpoint it should be using is
# /output/download/{owner}/{slug}; curl retries cleanly there.
if ! curl -sS -L --retry 5 --retry-all-errors --retry-delay 3 \
    -o "$STAGE/out.zip" \
    -H "Authorization: Bearer ${KAGGLE_API_TOKEN:?set KAGGLE_API_TOKEN}" \
    "https://www.kaggle.com/api/v1/kernels/output/download/${REF}"; then
    echo "no output to pull (download failed)"
    exit 0
fi
unzip -q -o "$STAGE/out.zip" -d "$STAGE"

if ! find "$STAGE" -name document.md -print -quit | grep -q .; then
    echo "nothing finished yet"
    exit 0
fi

COPIED=0
for directory in "$STAGE"/out*; do
    [ -d "$directory" ] || continue
    SUMMARY="$(uv run python scripts/merge_ocr.py --from "$directory" --into "$DEST")"
    echo "$SUMMARY"
    N="$(printf '%s\n' "$SUMMARY" | sed -n 's/^copied \([0-9]\+\) new document.*/\1/p' | tail -1)"
    COPIED=$((COPIED + ${N:-0}))
done

if [ "$COPIED" -gt 0 ]; then
    git add "$DEST"
    git commit -q -m "ocr: ${COPIED} document(s) from Kaggle

Pulled by scripts/kaggle-pull.sh. A kernel's output is scratch space and the
version disappears when the next one is pushed." && echo "committed ${COPIED} document(s)"
    git push origin HEAD >/dev/null 2>&1 && echo "pushed" || echo "push failed; will retry"
fi
