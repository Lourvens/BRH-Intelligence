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

colab exec -s "$SESSION" \
    "import shutil; shutil.make_archive('/content/out', 'zip', '/content/out')" >/dev/null
colab download -s "$SESSION" /content/out.zip "$STAGE/out.zip" >/dev/null
unzip -q "$STAGE/out.zip" -d "$STAGE/x"

uv run python scripts/merge_ocr.py --from "$STAGE/x" --into "$DEST"
