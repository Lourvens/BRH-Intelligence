# ADR-0003: Postgres for corpus metadata, Pinecone for vectors

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The platform needs two different kinds of storage, plus a durable front-half
inventory:

1. **Vectors** for semantic search over chunks, with metadata filtering.
2. **Structured, relational metadata** — documents, their pages, their chunks,
   ingestion job history — plus the joins needed to build a citation
   ("document X, page 7, snippet …").
3. **Discovery state** — every PDF URL seen on `brh.ht`, including URLs that
   point to the same bytes, download status, and HTTP change hints.

A pure vector store can carry scalar metadata, but it is not a system of
record: no meaningful uniqueness constraints, no joins, no audit log.

## Decision

- **Pinecone** holds vectors + minimal filter metadata, keyed by chunk id.
  The index uses **integrated inference** (`multilingual-e5-large`, cosine),
  so text goes in and no client-side embedding key is required in the default
  configuration (ADR-0004).
- **Postgres** (schema `corpus`) is the system of record for parsed corpus
  data: `documents`, `pages`, `chunks`, and `processing_jobs`. The inventory
  tables `crawl_runs` and `crawl_urls` are the discovery/download ledger and
  deliberately precede `documents`. Citations are assembled by joining a
  Pinecone hit's chunk id to the `chunks`/`pages`/`documents` rows.

Identity and idempotency are layered:

- a discovered URL is unique in `crawl_urls`;
- downloaded bytes are content-addressed by SHA-256 in `data/raw/web/`, so
  multiple URLs may legitimately reference one file;
- a parsed document is unique by `documents.sha256`;
- a page is unique by `(document_id, page_number)` and a chunk by `chunk_id`
  plus `(document_id, page_number, ordinal)`;
- processing is keyed by `(document_id, stage, idempotency_key)`.

Database constraints are the final guard. The inventory and OCR runners also
use manifests/ledgers so interrupted runs can resume without re-downloading or
re-processing completed work.

## Consequences

Easier:

- Citations are relational and exact — document title, page number, and a deep
  link are one join away.
- Re-runs are safe at each identity boundary; URL aliases are retained while
  identical PDF bytes are stored once.
- One Postgres serves metadata now and LangGraph checkpoints later.

Harder:

- The corpus database and vector index are two datastores to keep coherent.
  ADR-0012 implements per-document writer locks, durable index manifests,
  versioned batch writes and reconciliation for missing/stale vectors.
- A local Postgres to run (`docker compose up postgres`).

## Alternatives considered

- **Pinecone only.** Rejected: no joins, no uniqueness, no audit trail.
- **Postgres + pgvector.** Rejected for v1: the team already runs Pinecone and
  its integrated inference removes an embedding step. `pgvector` remains a
  reasonable future swap if we want one datastore.

## Implementation boundary

The inventory, transactional corpus repository, exact-token chunking bridge,
hosted Pinecone indexing and shared retrieval are implemented. Migration
0004 adds durable index state. ADR-0012 records recovery behavior and the live
Postgres/Pinecone acceptance test. Corpus-wide indexing is an operator run,
not something implied by an adapter or smoke test existing.
