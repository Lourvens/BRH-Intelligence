# ADR-0013 — Qwen client embeddings and bounded OCR ingestion

- Status: Accepted (user-approved rebuild, 2026-10-25)
- Supersedes: the hosted-E5 production choice in ADR-0004 and ADR-0012

## Context

Pinecone's monthly hosted-E5 embedding allowance stopped the OCR backfill.
The user selected Qwen3-Embedding-8B through OpenRouter and approved regenerating
chunks and embeddings from the durable PaddleOCR artifacts. OCR completion is
external to this migration; new artifacts must remain eligible automatically.

## Decision

LangChain orchestrates ingestion and provides the OpenAI-compatible embedding
client. OpenRouter receives raw document text using the embedding-only
`OPENROUTER_EMBEDDING_API_KEY`. Queries receive the versioned English retrieval
instruction defined in the adapter; their French wording is preserved.

The adapter validates native 4096-dimensional Qwen output, takes the first 1024
dimensions using the model's Matryoshka representation, and L2-normalizes it.
Indexing and queries use the same transformation. No provider-side dimension
parameter is assumed. The model, transformation and instruction identify the
embedding contract; changing them requires reindexing.

A pinned official Qwen tokenizer measures raw inputs including special tokens.
The hybrid chunker targets 768 tokens for prose and allows coherent paragraphs,
tables, series and provisions up to 1536 tokens. Both limits participate in its
identity. The model's independent hard context limit is 32768 tokens, or a
smaller explicitly configured provider limit. Neither chunking nor embedding
silently truncates. These approved thresholds are starting choices, not a
claim of experimentally optimal retrieval quality.

Pinecone stores client-computed vectors in the separate dense cosine index
`brh-intelligence-qwen-1024`, namespace `default`. The SDK handles ID-level
reconciliation below the existing LangChain and `RetrievalService` boundaries.
Postgres remains the canonical source of documents, pages, chunks and manifests.

One supervisor runs four document tasks with per-document advisory locks.
Embedding requests share a two-request semaphore and an initial one-request/sec
rate. Requests contain at most 32 inputs and 16384 locally counted input tokens.
Pinecone writes are also bounded by serialized payload size. Checkpoints remain
sequential within a document. Authentication, credit and hard-quota failures
stop new work; transient failures receive bounded retries.

Each successful provider microbatch is upserted before requesting the next.
The coordinator records batch-level progress and checks remote matching IDs on
resume, including partial writes whose enclosing batch never completed.

A one-time durable reset records the affected document IDs and obsolete remote
IDs before deleting only their derived chunk/index state. It retains artifacts,
PDFs, discovery, documents, extracted pages and extraction jobs. Completed reset
steps are not replayed. The old worker must stop before the reset. Retrieval
coverage is temporarily reduced and grows as new manifests are verified.

## Consequences

- OpenRouter embedding cost and Pinecone vector storage/write quotas are separate.
- Crash recovery reuses matching remote records; an ambiguous request may still
  repeat paid embedding work. Exactly-once billing is not guaranteed.
- The shared canonical chunk table means simultaneous E5 and Qwen rechunking is
  unsupported. The old worker must remain stopped.
- Model comparisons and retrieval-quality claims are outside this approved
  rebuild. Acceptance validates wiring, integrity, citations and recovery.

## References

- [Qwen model and Matryoshka support](https://huggingface.co/Qwen/Qwen3-Embedding-8B)
- [LangChain compatible embedding APIs](https://reference.langchain.com/python/langchain-openai/embeddings/base/OpenAIEmbeddings)
- [OpenRouter embedding endpoint](https://openrouter.ai/docs/api/api-reference/embeddings/create-embeddings)
