# LangChain ingestion pipeline completion plan

**Date:** 2026-10-24
**Status:** Ingestion/indexing/retrieval implemented and live-tested; corpus relevance evaluation remains
**Scope:** Complete ingestion, indexing and retrieval after OCR and chunking.
OCR execution on Kaggle is an external input and is deliberately out of scope.

## Decision

Use LangChain at the integration boundaries while keeping BRH domain logic
owned by `brh_core`:

```text
BRH Chunk
  → langchain_core.documents.Document
  → Pinecone hosted Records embedding and vector storage
  → BRH RetrievalService
  → LangChain retriever adapter
  → LangSmith evaluation
```

The deterministic hybrid chunker, frozen BRH models, Postgres repository,
processing ledger and citation builder remain the source of truth. LangChain
must not replace them with untyped dictionaries or a second persistence path.

## Original gap analysis (implementation gaps below are now resolved)

Already implemented:

- content-addressed discovery and SHA-256 identity;
- page-aware OCR/PyMuPDF extraction contract;
- structure-aware hybrid chunking;
- Postgres document/page/chunk persistence;
- processing job keys;
- LangSmith chunk-preservation evaluation.

Missing at the time of planning:

- embedding implementations;
- memory and Pinecone vector stores;
- canonical `Chunk` → LangChain `Document` conversion;
- exact production tokenizer validation;
- vector metadata/version projection;
- durable index manifest and reconciliation;
- shared `RetrievalService`;
- retrieval-quality evaluation.

The main design risk was the two-database boundary: Postgres can contain a
new chunk set while Pinecone contains an old or partial vector set. The index
manifest/reconciliation layer is now implemented and live-tested (ADR-0012).
Corpus relevance evaluation remains outstanding.

## Dependency graph

```text
OCR artifacts (external)
          ↓
exact tokenizer + cap validation
          ↓
Chunk → LangChain Document
          ↓
hashing Embeddings ───── Pinecone hosted Records embedding
          ↓                         ↓
      memory VectorStore ───── Pinecone integrated Records store
                         ↓
              index manifest/reconciliation
                         ↓
                  RetrievalService
                         ↓
                LangSmith evaluation
```

## Phase 0 — Freeze the cross-layer contract

Add one canonical converter:

```python
Document(
    id=chunk.chunk_id,
    page_content=chunk.text,
    metadata={
        "document_id": document.document_id,
        "sha256": document.sha256,
        "page_number": chunk.page_number,
        "page_end": chunk.page_end,
        "chunk_type": chunk.chunk_type.value,
        "section_path": list(chunk.section_path),
        "chunker_id": chunker_id,
        "tokenizer_id": tokenizer_id,
        "embedding_id": embedding_id,
    },
)
```

The converter owns flat metadata projection. Raw chunk metadata remains in
Postgres; arbitrary nested metadata must never be sent directly to Pinecone.

Acceptance tests:

- deterministic `Document.id` and `page_content`;
- JSON-serializable, flat metadata;
- preserved page ranges and section paths;
- explicit SHA, chunker, tokenizer and embedding identities;
- stable vector metadata schema.

## Phase 1 — Exact tokenizer

The chunker already accepts `count_tokens` and `tokenizer_id`. Implement the
exact tokenizer adapter for the selected embedding model and make it mandatory
for production indexing.

Requirements:

- actual provider/model token count;
- stable tokenizer identity;
- clear failure when unavailable;
- no silent production fallback to the estimator;
- existing 448-token safety budget preserved;
- tokenizer identity included in content/index keys.

Test French accents, punctuation, HTML tables, Markdown tables, numeric rows,
long unbroken tokens and exact cap boundaries. The gate is:

```text
max(exact_token_count(chunk)) <= model_limit - reserve
```

## Phase 2 — Offline LangChain path

Implement the complete no-network path:

```text
Chunk → LangChain Document → hashing Embeddings
      → memory vector store → similarity search → RetrievedChunk
```

The hashing embedder implements LangChain’s `Embeddings` methods:

- `embed_documents(texts)`;
- `embed_query(text)`.

Use SHA-256-derived stable buckets, never Python’s process-randomized `hash()`.
Vectors must have fixed dimension, deterministic normalization, stable ties,
metadata filtering, idempotent upsert, empty-store behavior and preserved batch
ordering.

Gate:

```text
BRH_VECTOR_BACKEND=memory
BRH_EMBEDDING_PROVIDER=hashing
```

must support offline ingestion, indexing and retrieval tests.

## Phase 3 — Pinecone integrated embedding contract

Use Pinecone's hosted embedding model for production. This is intentionally
not represented as a LangChain `Embeddings` object: Pinecone embeds text
records at upsert and query time. LangChain remains the application boundary
through `Document` and `BaseRetriever`.

Required behavior:

- explicit text field matching the Pinecone index field map;
- bounded record batches;
- retry and rate-limit handling;
- scalar/filterable metadata projection;
- query-time hosted embedding using the same field/model;
- provider/model/index identity in the processing key;
- LangSmith trace metadata around indexing and retrieval.

The production embedding identity is index-owned and should include:

```text
pinecone:model:index:namespace:tokenizer_id
```

An index cannot be marked successful if any batch is incomplete or unknown.

## Phase 4 — LangChain/Pinecone integration

The offline memory adapter is implemented. The production adapter uses
Pinecone's integrated text-record API and exposes a LangChain
`BaseRetriever` wrapper:

- add/upsert documents with explicit IDs;
- similarity search with scores;
- metadata filters;
- delete IDs;
- namespace isolation;
- statistics and health checks;
- deterministic response parsing.

Test fake-index upsert payloads, metadata flattening, query parsing, deletes,
namespace isolation, score ordering and missing metadata. The current
contract tests cover this adapter offline; a live-index smoke test remains
required before enabling the production backfill.

## Phase 5 — Index manifest and reconciliation

The current processing ledger is not enough for remote vector state. Add a
durable index manifest with:

```text
document_id, sha256, chunker_id, tokenizer_id, embedding_id
vector_backend, namespace
desired_chunk_ids, written_chunk_ids, deleted_chunk_ids
status, attempt, last_error, started_at, finished_at
```

Index algorithm:

1. Read current Postgres chunks.
2. Calculate the desired versioned chunk ID set.
3. Create or resume one manifest for that document/version.
4. Embed and upsert bounded batches.
5. Persist each successful batch checkpoint.
6. Delete vectors no longer in the desired set.
7. Verify remote IDs/metadata where supported.
8. Mark success only after reconciliation.

Reconciliation must detect and repair:

- Postgres chunks missing in the vector store;
- vectors with no Postgres chunk;
- stale SHA or chunker/tokenizer/embedding identity;
- wrong namespace;
- partial upserts and deletes;
- crashes after remote success but before local checkpoint.

An indexed document is successful only when desired IDs equal remote IDs, all
version metadata matches and every vector resolves to Postgres.

## Phase 6 — RetrievalService

Implement the shared BRH retrieval boundary after indexing is reliable:

```text
query → query embedding → over-fetch candidates → threshold
      → reject stale hits → table/continuation expansion
      → Postgres metadata → citations
```

Over-fetch by `top_k * 3` or `top_k * 4`. Do not deduplicate only by page
before table expansion: multiple rows on one page can be independently
relevant. Return `RetrievedChunk`, `SearchResult` and `Citation`; a LangChain
retriever adapter wraps this service rather than implementing another path.

Test thresholds, stable ordering, filters, empty results, missing rows, stale
hits, table continuation expansion, multi-page citations and identical agent/
MCP results.

## Phase 7 — LangSmith retrieval evaluation

Keep the current chunk-preservation dataset as preprocessing regression data.
Create a retrieval dataset with deterministic expected chunk IDs and pages:

```json
{
  "inputs": {"question": "Quel était le taux directeur en 2014 ?", "filters": {}},
  "outputs": {
    "relevant_chunk_ids": ["..."],
    "relevant_document_ids": ["..."],
    "relevant_pages": [12]
  }
}
```

Cover prose, provisions, table row/column-period queries, units, multi-page
continuations and similar reports. Primary deterministic metrics:

- Recall@k;
- MRR and nDCG;
- relevant-page recall;
- document precision;
- citation-page accuracy;
- table-row recall;
- stale-vector rate;
- empty-result correctness;
- latency and embedding cost.

LLM judges may evaluate answer faithfulness later, but must not replace
deterministic retrieval metrics.

## Final execution order

```text
0. Chunk → LangChain Document contract
1. Exact tokenizer
2. Hashing Embeddings
3. Memory vector store
4. Offline end-to-end tests
5. Pinecone hosted embedding contract
6. Pinecone adapter
7. Index manifest + reconciliation
8. RetrievalService
9. LangChain retriever adapter
10. LangSmith retrieval dataset/evaluation
11. Agent and MCP integration through RetrievalService
```

## Production readiness gates

- exact tokenizer proves every production chunk is under the real limit;
- offline LangChain path passes without external services;
- hosted embedding batches are bounded/retryable and index configuration is checked;
- vector IDs and metadata are version-safe;
- stale vectors are deleted after re-chunking;
- reconciliation repairs partial indexing;
- every retrieval hit resolves to Postgres;
- table continuation and row identity survive retrieval;
- LangSmith reports deterministic metrics by content family;
- agent and MCP never bypass `RetrievalService`.

## First implementation slice (completed)

Implement Phases 0–2 together:

1. canonical `Chunk` → LangChain `Document` conversion;
2. exact tokenizer adapter contract and tests;
3. deterministic hashing embeddings;
4. LangChain-compatible memory vector store;
5. offline ingestion/index/search integration test.

This slice and production indexing/retrieval are complete. See ADR-0012 and
the ingestion operations runbook for the implemented commands, recovery
guarantees and real-service tests. Phase 7's statistical relevance evaluation
and agent/MCP surface wiring remain follow-up work.
