#!/usr/bin/env bash
# Watch the Kaggle OCR kernel and pull its output the moment it completes.
#
# Started with setsid so it outlives the shell that launched it. Lives in the
# repository on purpose: the previous copy was in /tmp and disappeared when the
# machine cleared it, taking the watcher with it.
#
#   KAGGLE_API_TOKEN=... setsid nohup bash scripts/kaggle-watch.sh &
set -uo pipefail

cd "$(dirname "$0")/.." || exit 1
export KAGGLE_API_TOKEN="${KAGGLE_API_TOKEN:?set KAGGLE_API_TOKEN}"
export PATH="$HOME/.local/bin:$PATH"

REF="${REF:-lourvensluxamar/brh-ocr-batch}"
LOG="${LOG:-/tmp/opencode/kaggle_watch.log}"
mkdir -p "$(dirname "$LOG")"

for _ in $(seq 1 720); do
    STATUS="$(timeout 60 kaggle kernels status "$REF" 2>&1 | tail -1)"
    printf '%s kaggle: %s | local=%s\n' \
        "$(date -u +%H:%M:%SZ)" "$STATUS" \
        "$(ls -d data/ocr/*/ | grep -v _ledger | wc -l)" >> "$LOG"
    case "$STATUS" in
        *COMPLETE*)
            echo "$(date -u +%H:%M:%SZ) pulling" >> "$LOG"
            bash scripts/kaggle-pull.sh "$REF" >> "$LOG" 2>&1
            exit 0
            ;;
        *ERROR*|*CANCEL*)
            echo "$(date -u +%H:%M:%SZ) ended without output" >> "$LOG"
            exit 1
            ;;
    esac
    sleep 120
done
