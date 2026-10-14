#!/usr/bin/env bash
# Seed the corpus from the sibling project.
#
# Copies the source PDFs and the previously parsed Markdown so the pipeline
# has data on day one. Safe to re-run: cp only overwrites with newer files.
#
# The parsed Markdown is kept for reference only — our pipeline re-extracts
# page-aware text from the PDFs (ADR-0005), because the Markdown lost page
# numbers.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SIBLING="${BRH_SIBLING:-$REPO_ROOT/../brh-intelligence-queryengine}"

RAW_DIR="$REPO_ROOT/data/raw"
PROCESSED_DIR="$REPO_ROOT/data/processed"

if [[ ! -d "$SIBLING/data/pdfs" ]]; then
  echo "Sibling corpus not found at: $SIBLING/data/pdfs" >&2
  echo "Set BRH_SIBLING=/path/to/brh-intelligence-queryengine and retry." >&2
  exit 1
fi

mkdir -p "$RAW_DIR" "$PROCESSED_DIR"

echo "Copying PDFs  $SIBLING/data/pdfs  ->  $RAW_DIR"
cp -u "$SIBLING"/data/pdfs/*.pdf "$RAW_DIR"/ 2>/dev/null || true

if [[ -d "$SIBLING/data/processed" ]]; then
  echo "Copying parsed Markdown (reference only)  ->  $PROCESSED_DIR"
  cp -u "$SIBLING"/data/processed/*.md "$PROCESSED_DIR"/ 2>/dev/null || true
fi

echo
echo "Corpus seeded:"
ls -1 "$RAW_DIR" | sed 's/^/  /'
