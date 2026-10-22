#!/usr/bin/env bash
# Pull whatever a Colab session has produced so far and merge it locally.
#
#   bash scripts/colab-pull.sh <session> [dest]
#
# Drive cannot be mounted non-interactively here (`colab drivemount` fails with
# "mount failed"), so a reclaimed runtime takes /content with it. Pulling every
# few minutes bounds that loss to the documents produced since the last pull.
#
# Safe to run repeatedly: merge_ocr.py copies only missing documents and unions
# ledger events, so a second pull of the same work changes nothing.

set -euo pipefail

SESSION="${1:?usage: colab-pull.sh <session> [dest]}"
DEST="${2:-data/ocr}"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

# colab exec reads its program from stdin — an argument is rejected as "extra".
# The output directory only exists once the chunk has started OCR, so an early
# pull must say "nothing yet" instead of raising out of the zip call.
RESULT="$(printf 'import pathlib, shutil\nout = pathlib.Path("/content/out")\nif out.is_dir():\n    shutil.make_archive("/content/out", "zip", "/content/out")\n    print("ARCHIVED")\nelse:\n    print("EMPTY")\n' \
    | colab exec -s "$SESSION" 2>&1)"

case "$RESULT" in
    *ARCHIVED*) ;;
    *) echo "nothing finished yet"; exit 0 ;;
esac
colab download -s "$SESSION" /content/out.zip "$STAGE/out.zip" >/dev/null
unzip -q "$STAGE/out.zip" -d "$STAGE/x"

if ! find "$STAGE/x" -name document.md -print -quit | grep -q .; then
    echo "nothing finished yet"
    exit 0
fi

SUMMARY="$(uv run python scripts/merge_ocr.py --from "$STAGE/x" --into "$DEST")"
echo "$SUMMARY"

# Commit as soon as work lands. A Colab runtime is a cache, not storage: the
# documents exist there only until the next reclaim, so the repository is the
# only copy that survives. Leaving them uncommitted here is the same mistake as
# leaving them on a Modal volume.
COPIED="$(printf '%s\n' "$SUMMARY" | sed -n 's/^copied \([0-9]\+\) new document.*/\1/p' | tail -1)"
if [ "${COPIED:-0}" -gt 0 ]; then
    git add "$DEST"
    git commit -q -m "ocr: ${COPIED} document(s) from Colab

Pulled by scripts/colab-pull.sh. The runtime is reclaimed after about an hour,
so anything left on it is lost." && echo "committed ${COPIED} document(s)"
    # Publishing is what makes the skip list live for the other runners: they
    # read it from raw.githubusercontent.com, so a local-only commit is invisible
    # to them. Best effort — a failed push must not lose the commit.
    git push origin HEAD >/dev/null 2>&1 && echo "pushed" || echo "push failed; will retry"
fi
