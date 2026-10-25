# ADR-0012: Resumable LangChain ingestion with Pinecone hosted embeddings

- **Status**: Accepted
- **Date**: 2026-10-24
- **Extends**: ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0011

ADR-0013 supersedes this ADR's hosted-E5 production choice and fixed chunk
budget. Its LangChain orchestration, canonical projection, durable manifests,
locking and reconciliation decisions remain in force for Qwen client vectors.

## Context

OCR arrives incrementally from external GPU runners. A PDF may first have a
text-layer fallback and later receive canonical PaddleOCR Markdown. Replacing
Postgres chunks can leave stale vectors behind, and a remote write may succeed
even when the client loses its acknowledgement. A historical successful job
therefore cannot prove either current content identity or remote convergence.

The selected production model is Pinecone's hosted `multilingual-e5-large`.
Pinecone exposes two distinct API families: Records integrated inference and
schema-based Documents indexes. SDK attribute availability does not identify
which kind of index is configured.

## Decision

1. A LangChain runnable composes discovery and ingestion. BRH retains its
   deterministic hybrid chunker, frozen domain objects and Postgres repository.
   Discovery failures do not prevent processing artifacts already present.
2. Production uses a Records integrated index created for the hosted model.
   `upsert_records(records=..., namespace=...)` embeds passages remotely;
   `search(inputs={"text": ...}, ...)` embeds queries remotely. Both target
   the same index host, namespace, model and mapped text field. Configuration
   mismatches fail before indexing. Documents API autodetection is removed.
3. Pinecone's model API reports a 507-token sequence limit and maximum batch
   size 96. Use the selected E5 tokenizer with the passage prefix and special
   tokens; fingerprint its file contents in the tokenizer identity. Production
   indexing cannot use the estimator. The default chunk budget remains 448.
   Provisioned indexes use `truncate=NONE` for passages and queries.
4. Convert every BRH chunk through the canonical LangChain `Document`
   projection. Send only supported flat metadata. Keep arbitrary structural
   metadata and full canonical evidence in Postgres.
5. Store the current content key on the document. A match requires current
   metadata and the corresponding successful chunk job, not just any historic
   success. Keys include extraction content, chunker, tokenizer, embedding
   configuration and index destination. Blank scans remain pending OCR.
6. Migration `0004_index_manifest` persists desired, known, written and deleted
   IDs, version, attempt, status and error per document and index target.
   Persist old IDs before local replacement and complete intent before any
   remote mutation. Save checkpoints after batches. On retry, fetch matching
   records and reuse them, including remotely accepted but unacknowledged work.
7. Delete stale IDs only after upserting desired content. Poll for expected
   text/version metadata and stale-ID absence; compare the final document ID
   set. Only then mark success. Failed verification remains retryable.
   Reconciliation is restricted to a document's deterministic ID prefix.
8. Serialize ingestion for one document with a Postgres session advisory lock.
   No database transaction remains open during remote calls. Connection loss
   releases the lock. Another worker reports contention and can retry later.
9. Retrieval over-fetches, rejects stale or unresolved hits, preserves distinct
   rows on the same page, expands bounded table context, and builds citations
   from Postgres. User-facing LangChain retrieval wraps `RetrievalService`.
10. A repeatable CLI cycle picks up new PDFs and OCR. Explicit reconciliation
    can also read persisted chunks when original PDFs are offline. Changing
    the tokenizer/chunker requires re-ingestion before those chunks are indexed.

The `--from-ocr` entry point starts at published extraction artifacts rather
than at PDF discovery. It trusts the existing content-addressed extraction
metadata for source identity, validates completion and page markers, and never
requires a source PDF or invokes fallback extraction. No second persistence or
indexing path is introduced. Missing local PDFs remain absent in metadata;
this entry point does not invent source file locations or document URLs.

## Consequences

Retries do not lose stale IDs or silently accept partial remote state. Repeated
verification reuses matching vectors rather than paying to embed them again.
The in-memory backend has a unique instance identity because its state is
ephemeral. The manifest is operational state, not another copy of document text.

Pinecone is eventually consistent. Verification may report a retryable failure
after a remote success. Document retrieval is unavailable while its manifest
is incomplete; correctness takes priority over serving a mixed version.
This is not a distributed transaction or an atomic namespace swap.

The official `langchain-pinecone` package also exposes `PineconeEmbeddings`
for the separate inference API. That valid alternative is unnecessary for the
selected integrated Records path. Client-supplied vector production is outside
this decision; hashing remains an offline development facility.

Bulk ingestion and retrieval-quality evaluation are operational follow-up,
not evidence supplied by the connectivity smoke test. OCR execution remains
external; this pipeline consumes completed artifacts without waiting for the
whole corpus.

## Evidence and references

- Offline failure injection covers remote acknowledgement loss, interrupted
  deletes, new OCR, artifact reversion, missing vectors, owned orphan vectors,
  discovery outages, and database-only repair.
- A real Postgres acceptance test closes/reopens the pool during recovery.
- An opt-in live test runs PDF → hosted indexing → later OCR replacement →
  LangChain retrieval → page citation in an isolated namespace and database.
- [Pinecone record upserts](https://docs.pinecone.io/guides/index-data/upsert-data)
- [Pinecone semantic search](https://docs.pinecone.io/guides/search/semantic-search)
- [Pinecone integrated embedding API families](https://docs.pinecone.io/guides/search/integrated-embedding)
- [LangChain Pinecone embedding alternative](https://docs.langchain.com/oss/python/integrations/embeddings/pinecone)
