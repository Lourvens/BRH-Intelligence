# ADR-0014 — Markdown research catalogue and evidence graph

- Status: Accepted (implementation requested by the user, 2026-10-25)
- Extends: ADR-0005, ADR-0006 and ADR-0013

## Decision

Completed `data/ocr/<sha256>/document.md` artifacts are the primary reading
source. A separate, rebuildable Postgres research projection publishes Markdown
pages without waiting for vector indexing. Official PDF links come from the
inventory's content-hash aliases, never a runner's local path. Upload dates are
labelled separately from evidenced publication dates and covered periods.

Research reads pass through `RetrievalService`. A thin custom ASGI app mounted
in the existing Agent Server supplies Next.js with bounded corpus and entity
APIs. Browsing constructs no vector client until semantic retrieval is requested.

Postgres stores entities, aliases, page mentions and relationship assertions.
Traversal is bounded to two hops, 100 nodes and 200 edges, with cycle avoidance
and explicit truncation. No new database or graph extension is required for V1.
Each assertion is qualified by its document, artifact version and quoted page
evidence; it is not promoted to an unqualified global fact.

A separate resumable pipeline uses an explicitly selected inexpensive LLM for
entity/relationship proposals, deterministic schema/evidence checks and Jev for
support judgments. At the user's explicit request, extraction and Jev reuse
`OPENROUTER_EMBEDDING_API_KEY`; the clients and checkpoints remain separate.
Paid processing is opt-in
through the CLI. No extraction model or acceptance threshold is a production
default until the reviewed notebook evaluation is signed off. Pending assertions
are never exposed as accepted relationships. OCR changes invalidate old evidence.

## Consequences

The catalogue works independently of LLM and vector-provider availability.
Research tables do not modify the running canonical chunk/embedding backfill.
Entity identity is conservative: document-scoped by default, with cross-document
identity only through reviewed aliases. Structural checks and Jev judgments do
not certify factual accuracy. Full community/global GraphRAG is a later evaluated
extension; V1 provides evidence-backed local graph retrieval.
