#!/usr/bin/env bash
# Pull OCR output from the Modal volume and reconcile the local ledger.
#
#   bash scripts/modal-pull.sh [dest] [--clean]
#
# Downloads /ocr from the `brh-ocr` volume into `dest` (default data/ocr), then
# merges the per-document ledgers the containers wrote into the local
# state.jsonl. Events already present locally are kept once, so pulling twice is
# not a duplication bug. `--clean` drops the merged ledger directory locally
# afterwards; the documents themselves are never removed.

set -euo pipefail

DEST="${1:-data/ocr}"
CLEAN="${2:-}"

echo "== downloading /ocr from the brh-ocr volume"
# `modal volume get <vol> /ocr <local>` creates <local>/ocr/..., so stage then copy
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
modal volume get brh-ocr /ocr "$STAGE" --force
mkdir -p "$DEST"
cp -a "$STAGE/ocr/." "$DEST/"

echo "== merging ledgers into state.jsonl"
python - "$DEST" <<'PY'
import json
import pathlib
import sys

dest = pathlib.Path(sys.argv[1])
state = dest / "state.jsonl"
ledger_dir = dest / "_ledger"

known: set[tuple[str, str, str]] = set()
events: list[str] = []
if state.is_file():
    for line in state.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        known.add((row.get("sha256", ""), row.get("event", ""), row.get("ts", "")))
        events.append(line)

added = 0
for path in sorted(ledger_dir.glob("*.jsonl")) if ledger_dir.is_dir() else []:
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        key = (row.get("sha256", ""), row.get("event", ""), row.get("ts", ""))
        if key in known:
            continue
        known.add(key)
        events.append(line)
        added += 1

if added:
    state.write_text("\n".join(events) + "\n", encoding="utf-8")
print(f"  {added} new event(s) merged, {len(events)} total")

done = sum(1 for line in events if '"event": "done"' in line or '"event":"done"' in line)
print(f"  documents marked done: {done}")
PY

if [ "$CLEAN" = "--clean" ]; then
    echo "== cleaning the merged ledger"
    rm -rf "$DEST/_ledger"
fi

echo "== status"
if command -v uv >/dev/null 2>&1; then
    uv run python -m brh_core.ingestion.ocr status --out "$DEST"
else
    PYTHONPATH="$PWD/packages/core/src${PYTHONPATH:+:$PYTHONPATH}" \
        python -m brh_core.ingestion.ocr status --out "$DEST"
fi
