# ADR-0003: Postgres for metadata, Pinecone for vectors

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The platform needs two different kinds of storage:

1. **Vectors** for semantic search over chunks, with metadata filtering.
2. **Structured, relational metadata** — documents, their pages, their chunks,
   ingestion job history — plus the joins needed to build a citation
   ("document X, page 7, snippet …").

A pure vector store can carry scalar metadata, but it is not a system of
record: no meaningful uniqueness constraints, no joins, no audit log.

## Decision

- **Pinecone** holds vectors + minimal filter metadata, keyed by chunk id.
  The index uses **integrated inference** (`multilingual-e5-large`, cosine),
  so text goes in and no client-side embedding key is required in the default
  configuration (ADR-0004).
- **Postgres** (schema `corpus`) is the system of record: `documents`,
  `pages`, `chunks`, `processing_jobs`. Citations are assembled by joining a
  Pinecone hit's chunk id to the `chunks`/`pages`/`documents` rows.

Idempotency is enforced at the database layer (unique constraints), not in
Python guards.

## Consequences

Easier:

- Citations are relational and exact — document title, page number, and a deep
  link are one join away.
- Re-runs are safe: the DB rejects duplicate work.
- One Postgres serves metadata now and LangGraph checkpoints later.

Harder:

- Two datastores to keep coherent. Mitigated by making the ingestion pipeline
  the single writer and by keying Pinecone records off Postgres chunk ids.
- A local Postgres to run (`docker compose up postgres`).

## Alternatives considered

- **Pinecone only.** Rejected: no joins, no uniqueness, no audit trail.
- **Postgres + pgvector.** Rejected for v1: the team already runs Pinecone and
  its integrated inference removes an embedding step. `pgvector` remains a
  reasonable future swap if we want one datastore.
