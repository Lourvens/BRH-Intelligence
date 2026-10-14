# System overview

Last updated: 2026-10-14.

## One workflow, four surfaces

BRH Intelligence is a single retrieval core with several ways in.

```
                     ┌──────────────────────────────┐
   BRH PDFs  ──────► │  Ingestion (brh_core)         │
   (data/raw)        │  discover → extract (PyMuPDF) │
                     │  → chunk → store              │
                     └───────────────┬──────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
       ┌──────────────────┐                    ┌──────────────────┐
       │ Postgres (corpus)│                    │ Pinecone (vectors)│
       │ documents, pages,│                    │ integrated        │
       │ chunks, jobs     │                    │ inference         │
       └────────┬─────────┘                    └────────┬──────────┘
                │                                       │
                └───────────────┬───────────────────────┘
                                ▼
                    ┌────────────────────────┐
                    │ RetrievalService       │  brh_core.retrieval
                    │ retrieve(q, k) → chunks│  (THE shared core)
                    │      + citations       │
                    └───────┬────────┬───────┘
                            │        │
              ┌─────────────┘        └──────────────┐
              ▼                                     ▼
   ┌─────────────────────┐               ┌─────────────────────┐
   │ LangGraph agent     │               │ MCP server          │
   │ retrieve→gen/refuse │               │ search_documents,   │
   │ (services/agent)    │               │ get_page, ...       │
   └──────────┬──────────┘               └──────────┬──────────┘
              │ useStream                            │ MCP clients
              ▼                                      ▼
   ┌─────────────────────┐               ┌─────────────────────┐
   │ Next.js web app     │               │ 3rd-party agents    │
   │ chat + citation deep│               │ (Claude, Cursor, …) │
   │ links + PDF viewer  │               └─────────────────────┘
   └─────────────────────┘
```

## Pieces

| Piece | Location | Responsibility | ADR |
|---|---|---|---|
| Config | `packages/core/src/brh_core/config.py` | Env-driven settings, one object | — |
| Domain model | `packages/core/src/brh_core/models.py` | Frozen `Document`/`Page`/`Chunk`/`Citation` | — |
| DB | `packages/core/src/brh_core/db/` | Postgres pool, migrations, repositories | 0003 |
| Vector store | `packages/core/src/brh_core/vectorstore/` | Pinecone (integrated + client-side), memory fake | 0003, 0004 |
| Embeddings | `packages/core/src/brh_core/embeddings/` | Provider-agnostic embedder | 0004 |
| Ingestion | `packages/core/src/brh_core/ingestion/` | discover → extract → chunk → store | 0005 |
| Retrieval | `packages/core/src/brh_core/retrieval/` | The shared `RetrievalService` | 0006 |
| Citations | `packages/core/src/brh_core/citations.py` | Build `#page=N` deep links | 0005 |
| Agent | `services/agent/src/brh_agent/` | LangGraph graph + prompts | 0002 |
| MCP | `services/mcp/src/brh_mcp/` | FastMCP tools | 0007 |
| Web | `apps/web/` | Next.js chat + viewer | 0008 |

## Data flow: one question

1. Web app submits the question to the LangGraph server via `useStream`.
2. `retrieve` node calls `RetrievalService.retrieve(question, top_k)`,
   which searches Pinecone and joins Postgres for citations.
3. Router: if no chunk clears the score threshold → `refuse` node (answer in
   French: the documents do not support this).
4. Otherwise `generate` streams a French answer with inline `[n]` markers;
   `citations` are stored in graph state and read by the UI.
5. The UI renders `[n]` as a clickable chip → `/documents/{slug}?page=N`,
   which embeds `/api/pdfs/{slug}#page=N` in the browser's PDF viewer.

The MCP server answers the same question shape by calling step 2 directly.

## Storage

| Data | Store | Lifetime |
|---|---|---|
| Source PDFs | `data/raw/` (gitignored) | Until deleted |
| Pages + chunks + job ledger | Postgres `corpus` schema | System of record |
| Chunk vectors | Pinecone namespace | Rebuildable from Postgres |
| Config / secrets | `.env` (gitignored) | Operator-managed |

## What is deliberately *not* here yet

Crawler/autodiscovery of `brh.ht`, Haitian Creole and English, indicator
comparison, multi-agent research, auth + rate limiting on MCP, reranking,
session memory. Each is a backlog item in `PROGRESSION.md`.
