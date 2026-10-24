# ADR-0005: Page-aware extraction and canonical Markdown

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The product promise is *"open the original PDF page"*. A citation is only
useful if it points at the right page of the right document.

The sibling project parsed PDFs through LlamaCloud into Markdown. That output
is excellent prose but **page-less**: its manifest records `pages: null` and
the Markdown carries no page markers, so citations could only reference
printed page numbers scraped from tables of contents. That is not good enough
to deep-link a viewer.

The current corpus is mixed: some PDFs are born-digital and some are scanned
or hybrid. The extraction contract must preserve PDF page identity while
allowing a layout/OCR engine to emit tables, figures, and text. The database
bridge and incremental OCR replacement are implemented (ADR-0012).

## Decision

Produce a canonical, page-marked representation during extraction/OCR:

- the implemented batch runner is `PaddleOCR-VL` through its Transformers
  backend, behind the narrow `Engine` protocol;
- each engine returns ordered `OcrPage` values numbered from 1;
- the runner writes one content-addressed document directory containing
  `document.md`, page markers (`<!-- page N -->`), local figure assets, and
  `meta.json`, with an append-only JSONL ledger for resume/retry;
- `markdown.py` removes engine presentation details, converts regular HTML
  tables to pipe Markdown, preserves irregular tables safely, and fixes asset
  paths when pages are assembled;
- downstream chunking consumes these page markers. A chunk records its starting
  page and may record `page_end` when a section or table crosses a page;
- the relational ingestion bridge persists pages/chunks in Postgres atomically
  per document and uses their page provenance for later citations.

PyMuPDF is a deterministic fallback for PDFs without a verified OCR artifact;
it is not the canonical extractor when PaddleOCR output is available.

## Consequences

Easier:

- A citation maps to a real PDF page and opens it directly.
- OCR is resumable at document granularity and does not expose half-written
  Markdown: the final file is installed by an atomic rename.
- Extraction and normalization are deterministic after the selected engine
  version is fixed, and engine/version/counts are recorded in `meta.json`.

Harder:

- OCR quality and runtime depend on the engine and hardware. The selected
  PaddleOCR-VL path is measured and versioned, but still needs regression
  evaluation and production operational limits.
- Table structure can be irregular or include merged cells. Regular grids are
  normalized to pipe Markdown; irregular HTML is retained rather than padded
  in a way that could move values under the wrong header.
- Page markers describe PDF page order, not printed page labels. The latter
  may be present in text but is not citation identity.
- The OCR ledger is a local extraction ledger, not a replacement for the
  Postgres processing ledger in ADR-0003; the bridge imports the content-hash
  artifact without creating a second document identity.

## Alternatives considered

- **Keep LlamaCloud/LlamaParse.** Rejected as the primary path because of the
  page-loss problem; may return as optional enrichment if it preserves page
  markers.
- **PyMuPDF-only extraction.** Kept as a future/fallback adapter, but not
  sufficient as the current corpus path because scanned and mixed PDFs need
  OCR/layout handling.
- **VLM/OCR per page.** Accepted for the current extraction batch because it
  preserves page order and handles tables/figures; its quality and cost remain
  evaluation and operations work.
