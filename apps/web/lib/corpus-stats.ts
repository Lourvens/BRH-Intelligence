// Corpus figures shown on the landing page.
//
// A single source because these numbers appeared in three components and drifted
// apart: the hero said 34 documents while the checkout held 360.
//
// Refresh from the checkout, never from memory:
//   ls -d data/ocr/<sha>/ | grep -v _ledger | wc -l   # documents
//   uv run python scripts/verify_ocr.py               # pages
//
// Measured 2026-10-20.

export const corpusStats = {
  /** Inventory of brh.ht, from `brh_core.inventory`. */
  catalogued: "1\u202F169",
  /** Documents with a `document.md` in `data/ocr`. */
  documents: "360",
  /** Pages carrying a page marker, the unit a citation points at. */
  pages: "5\u202F592",
} as const;
