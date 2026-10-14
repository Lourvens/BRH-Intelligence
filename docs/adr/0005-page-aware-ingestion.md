# ADR-0005: Page-aware ingestion with PyMuPDF

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

## Decision

Extract text **per page** with **PyMuPDF** (`fitz`) during ingestion:

- `extract.py` returns a list of `(page_number, text)` for each PDF.
- `chunk.py` chunks **within page boundaries**, so every chunk carries its
  source `page_number` (1-based, matching the PDF viewer's `#page=N`).
- Pages and chunks are persisted in Postgres (ADR-0003); the vector payload
  carries `document_id`, `page_number`, and `chunk_id`.

PyMuPDF is offline, deterministic, fast, and licence-permissive (AGPL; fine
for this project — revisit if the licence terms ever conflict).

## Consequences

Easier:

- A citation maps to a real PDF page and opens it directly.
- Ingestion has no external parse dependency and no per-page cost.
- Re-ingestion is trivial.

Harder:

- PyMuPDF does not reconstruct complex table structure the way a VLM parser
  can. Financial tables may lose their grid. Mitigated for v1 by keeping the
  page text alongside chunks so the model can read the surrounding rows; a
  table-aware parser is a backlog item.
- Scanned/image-only PDFs would need OCR. Out of scope for v1 (the RDDCF
  corpus is digital text).

## Alternatives considered

- **Keep LlamaCloud/LlamaParse.** Rejected as the *primary* path because of
  the page-loss problem; may return as an optional enrichment step.
- **PDF text via `pypdf`.** Viable, but PyMuPDF is faster and gives better
  layout/ordering heuristics.
- **VLM table extraction per page.** Deferred on cost; strong candidate once
  table queries matter.
