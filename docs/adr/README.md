# Architecture Decision Records

Every non-trivial decision in BRH Intelligence gets an ADR here. Each follows
the Nygard template — **Context → Decision → Consequences** (plus
*Alternatives considered* where it earns its keep). Read the *Consequences*
before questioning a decision; that is where the trade-off lives.

To add one: pick the next number, copy the shape of an existing file, and add a
row to the index below.

## Current implementation boundary

The backend pipeline currently has a working front half:

```text
brh.ht WordPress media API
  → crawl_urls inventory + download ledger
  → SHA-256 content-addressed PDF store
  → OCR manifest + resumable ledger
  → page-marked canonical Markdown + assets
  → deterministic hybrid chunks (v2, exact E5 tokenizer for indexing)
  → Postgres corpus and durable index manifest
  → Pinecone hosted Records embedding + verified reconciliation
  → shared RetrievalService + LangChain retriever + page citations
```

The ingestion/indexing/retrieval path is implemented and verified with an
isolated live Postgres/Pinecone acceptance test (ADR-0012). OCR runners remain
external producers. Corpus-wide backfill and relevance evaluation are separate
operator tasks. MCP registration, agent generation and deployment remain
target architecture; they are not implied by the core pipeline being complete.

Identity is intentionally layered: URLs are unique inventory records, PDF
bytes are deduplicated by SHA-256, and parsed documents are keyed by SHA-256.
Multiple URLs pointing to one PDF are aliases, not duplicate corpus documents.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-monorepo-layout.md) | Monorepo with a Python + JS split | Accepted |
| [0002](0002-langgraph-for-the-agent.md) | LangGraph for the agent | Accepted |
| [0003](0003-postgres-metadata-plus-pinecone-vectors.md) | Postgres for corpus metadata, Pinecone for vectors | Accepted |
| [0004](0004-configurable-embeddings.md) | Configurable embeddings, French-first corpus | Accepted |
| [0005](0005-page-aware-ingestion.md) | Page-aware extraction and canonical Markdown | Accepted |
| [0006](0006-retrieval-service-as-shared-core.md) | Retrieval service as the shared core | Accepted |
| [0007](0007-mcp-server-shared-retrieval.md) | MCP server over the same retrieval | Accepted |
| [0008](0008-langgraph-sdk-frontend.md) | Frontend consumes the graph via the LangGraph SDK | Accepted |
| [0009](0009-langsmith-observability-and-deploy.md) | LangSmith for observability and deploy | Accepted |
| [0010](0010-provider-agnostic-llm.md) | Provider-agnostic LLM configuration | Accepted |
| [0011](0011-chunking-strategy.md) | Structure-aware hybrid chunking (v2) | Accepted (retrieval eval pending) |
| [0012](0012-resumable-langchain-ingestion.md) | Resumable LangChain ingestion with Pinecone hosted embeddings | Accepted |
| [0018](0018-arize-agent-observability.md) | Arize AX for agent observability | Accepted |
| [0019](0019-single-agent-system-prompt.md) | One system prompt for the agent identity | Accepted |
| [0020](0020-bounded-model-directed-graph.md) | Smaller graph with model-directed research and responses | Accepted |
| [0021](0021-streamed-agent-activity.md) | Temporary activity UI over the LangGraph SDK stream | Accepted |
| [0022](0022-opt-in-trace-content.md) | Opt-in Arize trace content for agent debugging | Accepted |
