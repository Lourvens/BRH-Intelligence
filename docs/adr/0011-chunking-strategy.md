# ADR-0011: Structure-aware hybrid chunking (v2)

- **Status**: Accepted — deterministic hybrid v2 selected; table-aware evaluation completed; embedding/retrieval evaluation pending
- **Date**: 2026-10-24
- **Evidence**: corpus profile (778 documents, 11 761 pages),
  `experiments/chunking/REPORT.md` (historical nine-arm, three-seed benchmark)
- **Supersedes**: nothing. Replaces the scaffold's `chunk_size`/`chunk_overlap`
  plan, which was never implemented.

## Context

ADR-0005 fixes the hard part: extraction preserves page markers and a citation
opens `#page=N`. A chunk may span pages, but it must retain its page range. The
scaffold's
inherited answer — `RecursiveCharacterTextSplitter` at 1 000 characters — was a
guess.

Two measurements decided the shape:

- **The corpus is table-heavy and long.** 10 588 tables (48 % raw HTML), 20.8 %
  over 600 tokens; sections p50 620 characters; 40.8 % of sections and 9.6 % of
  pages cross a boundary; a "provision" is usually `### 1.` plus `a) b) c)`,
  not `Article N`.
- **Fixed-size splitting loses the answer.** The historical benchmark put
  `RecursiveCharacterTextSplitter` at recall@5 0.658–0.697, while a fixed
  1 000-character window cut 76 % of its seams mid-word and destroyed 43 % of
  tables that would have fitted. The lexical-shift arm scored well, but it is
  not the selected production strategy: it is not the same algorithm as the
  deterministic structure-aware implementation.

Structure, not length, is the usable boundary in this corpus. The product owner
fixed four rules (prose by section and paragraph; dedicated table chunks with
title/header/unit/period/source; series kept whole or split chronologically;
regulations by provision).

The v2 corpus audit also found that OCR output is a mixed Markdown dialect, not
plain Markdown: 596 of 778 documents contain headings, 5,079 contain inline
HTML tables, 6,404 contain GFM table runs, and 889 contain image references.
There are 11,761 page markers, a median page payload of 2,251 characters, 876
navigation/TOC chunks, and 117 replacement characters. The parser therefore
keeps HTML and GFM table policies separate, preserves blank pages, marks
navigation instead of deleting it, and treats malformed wide rows/headers as
explicit fragments.

## Decision

Chunk with the deterministic structure-aware **hybrid** strategy **v2**, in
`brh_core.ingestion.chunking`, at a **448-token default budget**. The model
context limit is treated as 512 tokens, with 64 tokens reserved for special
tokens, prefixes and estimator error. An exact model tokenizer can be injected
through `count_tokens`; its identity is part of the chunker id.

**Blocking first.** Markdown becomes typed blocks (`heading`, `paragraph`,
`table`) carrying page spans. A table cut by a page marker is stitched back
together before any size decision — otherwise the continuation has no header.

**Four chunk types.**

| type | rule |
|---|---|
| `prose` | pack paragraphs and sub-headings under their section path; never cross a top-level division; split only between paragraphs, then sentences, then words |
| `table` | one table = one unit; over the cap, partition rows, repeat the envelope and header |
| `series` | a table whose rows or header are periods; grouped chronologically, never interleaved |
| `provision` | regulatory documents: lettered/numbered items are boundaries, so a threshold stays with its consequence |

**Tables over the cap.** Partition at *group* boundaries (year) before size
boundaries. Every part repeats the envelope — title, unit, period, source — and
the header rows. **Structure is repeated; data never is.** Rows are not
overlapped: a duplicated row silently double-counts in any sum the model
computes. Parts are linked by `table_id`, `part`, `part_count`, `row_start/end`
and `prev`/`next`; retrieval expands them.

**Provenance.** `page_number` is the citation target, `page_end` records a span,
`section_path` records where the chunk sits, `metadata` carries the table and
envelope facts. Ids are deterministic (`{doc}:p{page}:c{ordinal}` for prose,
`{doc}:p{page}:t{n}:r{a}-{b}` for a table part). `chunker_id()` returns
`structure-v2:448:safe-estimate-v2` for the default index key, so a rule change
or tokenizer change re-chunks without
re-downloading or re-OCRing.

**A caption is never a chunk.** A `Tableau 4.13` line above a table becomes the
table's envelope title, not a four-word prose chunk that duplicates it.

**Table semantics are preserved explicitly.** OCR HTML tables may encode
period headers as `td` cells rather than `th`; leading period rows are therefore
treated as headers. HTML data rows retain their original markup for citation
fidelity and also receive a compact labelled representation (`Ligne — label:
value`) for embedding. If a row exceeds the cap, the fragment repeats its row
label so numeric continuations are not detached from their subject. The table
envelope also carries bounded neighbouring context and a following `Source:`
line when present.

## Consequences

Easier:

- A table part is self-describing: title, unit, period, header. Retrieval can
  embed it without a paragraph of context, and the reader can read it alone.
- Page-level citation survives a page-spanning section or table: the citation
  opens the chunk's starting `page_number`, while `page_end` tells downstream
  consumers that the evidence continues. The citation contract must not imply
  that the full span is visible on the first page.
- The strategy is deterministic and offline: 778 documents chunk in 22.7 s with
  no keys and no network, which is what makes a CI regression test possible.
- Each concern is its own module, so the eval can vary one policy at a time.

Harder:

- **The cap is strict by default.** Pathological OCR rows are converted to
  explicit row fragments, and pathological headers become header fragments or
  are marked `header_oversized`; neither is allowed to exceed the budget.
  Across 778 documents, v2 emitted 68 596 chunks with p50 345, p95 433 and
  maximum 448 tokens; 302 row-fragment groups and 22 oversized-header cases
  were handled.
- **Token counts remain configurable.** The offline estimator is conservative
  and safe for CI, but production should inject the exact embedding tokenizer.
  The tokenizer id participates in the chunker id so changing tokenization
  invalidates content jobs and vectors.
- **Table integrity was verified for splitting, not for semantics.** The
  reconstruction invariant holds exactly (781 tables, 306 split, 0 failures).
  A table-aware LangSmith dataset now measures row preservation rather than
  impossible whole-table prefixes: 324 examples across three seeds and three
  content families. The first table-aware experiment scored 75.93 % strict row
  recall, 89.81 % windowed recall, 100 % page provenance and 100 % token-cap
  compliance. The remaining gap is concentrated in wide OCR rows and malformed
  multi-row headers.
- **`provision` is detected, not guaranteed.** 69 circulars open as such; 59 %
  use `Article N` and the rest use numbered headings or lettered items. Short
  circulars that fit in one chunk are not split at all.
- **The strategy is new code we own** (~1 000 lines across seven modules) rather
  than a library call. It is covered by focused offline tests, but it is ours
  to maintain.
- **Migration `0003_chunk_structure.sql`** adds the columns. The repository and
  ingestion orchestrator now persist the chunk objects transactionally; vector
  indexing and retrieval remain the next production phase.

## What is deliberately not here

- **Production retrieval evaluation remains open.** The historical benchmark
  is not evidence for the shipped implementation because it evaluated separate
  splitter arms. The current evaluation checks deterministic chunk preservation
  and provenance; the actual hybrid v2 still must be evaluated by content
  family against the production embedder and retrieval pipeline.
- **No LLM chunking.** Non-deterministic, per-page cost, and the measurement
  above did not justify it.
- **No parent-document retrieval.** The metadata (`table_id`, `part`,
  `row_start/end`) is shaped so it can be added without re-chunking.
- **No embedding or vector indexing yet.** The 448-token default is an
  embedding-facing contract, but the production tokenizer, embedder, vector
  store, and retrieval evaluation are next-phase work.

## Alternatives considered

- **`RecursiveCharacterTextSplitter` 1500/0** — the best fixed-size arm, 10
  points behind on recall and on the embedder ceiling. Rejected on measurement.
- **Fixed 1 000-character windows** — highest recall of any arm and unusable:
  76 % mid-word seams, 43 % of fit-able tables destroyed.
- **Header-aware markdown splitting** — scored 0.592; the header splitter
  rewrites blank lines, so the size pass loses paragraph boundaries and cuts
  tables 23.5 % of the time.
- **Lexical-shift / semantic-shift-1000** — historical benchmark leader, but
  rejected for production. It is not the shipped hybrid algorithm and shares a
  lexical bias with the BM25 evaluation.
- **Neural semantic chunking** — not selected; it costs an embedding call per
  sentence and its edge is inconsistent. The structure rules capture the same
  intuition with the document's own markup.
