# BRH Intelligence

A public knowledge platform for **Haiti's financial and economic information**:
ask questions in natural language, get answers grounded in official BRH
documents, open the exact source page, and let other people's agents use the
same knowledge through **MCP**.

> **This repository is a scaffold.** The structure, contracts, configuration,
> and wiring are in place; most of the implementation is not. Every module
> carries `TODO:` markers and signature-level stubs so you can build it step by
> step. The first vertical slice — the BRH document inventory — *is* implemented
> (`make inventory`). See [Build order](#build-order) below.

## The one workflow we build first

```
BRH PDF  ──►  page-aware extraction  ──►  Postgres (metadata, pages, chunks)
                     │                              │
                     └──►  Pinecone (vectors) ──────┘
                                   │
             ┌─────────────────────┼─────────────────────┐
             ▼                     ▼                     ▼
      LangGraph agent        Next.js web            MCP server
   (answer + citations)   (ask + open PDF page)   (same retrieval)
```

Everything else (indicator comparison, French/Creole/English, crawler,
multi-agent) is deliberately out of scope for now — see `PROGRESSION.md`.

## Layout

```
brh-intelligence/
├── packages/core/       # brh_core  — domain, storage, ingestion, retrieval  (CONTRACTS)
│   └── src/brh_core/
│       ├── config.py            ✅ real  (env plumbing)
│       ├── models.py            ✅ real  (frozen domain model)
│       ├── db/migrations/*.sql  ✅ real  (schema)
│       ├── db/pool.py           ✅ real  (connection pool)
│       ├── db/migrate.py        ✅ real  (migration runner)
│       ├── db/repository.py     ⬜ stub  (corpus documents/pages/chunks)
│       ├── vectorstore/base.py  ✅ real  (VectorStore protocol)
│       ├── vectorstore/         ⬜ stub  (pinecone, memory, factory)
│       ├── embeddings/base.py   ✅ real  (Embedder protocol)
│       ├── embeddings/          ⬜ stub  (openai, hashing, factory)
│       ├── inventory/           ✅ real  (brh.ht: discover → download → ledger)
│       ├── ingestion/           ⬜ stub  (discover, extract, chunk, pipeline)
│       ├── retrieval/service.py ⬜ stub  (THE shared core)
│       └── citations.py         ⬜ stub  (PDF page deep links)
├── services/agent/      # brh_agent — LangGraph graph
│   ├── graph.py                 ✅ real  (retrieve → generate|refuse)
│   ├── state.py                 ✅ real  (graph state)
│   ├── nodes.py                 ⬜ stub  (retrieve, generate, refuse)
│   ├── prompts.py               ⬜ stub  (French prompt)
│   └── llm.py                   ⬜ stub  (provider-agnostic chat model)
├── services/mcp/        # brh_mcp   — FastMCP server (tools to add)
├── apps/web/            # Next.js   — chat + citations + PDF viewer (to build)
├── docs/                # ADRs, architecture, plan, runbook
└── docker-compose.yml   # local Postgres
```

Legend: ✅ real = ready to use; ⬜ stub = signatures + `TODO`, you write the body.

## Build order

A suggested path. Each step is independently verifiable.

0. **Inventory (front half)** — already implemented. `make inventory` catalogues
   every PDF on `brh.ht` (so the ledger lists the whole corpus), then downloads
   the ones still missing into a content-addressed store (`brh_core.inventory`,
   migration `0002`). `make inventory ARGS="--limit 20"` downloads the next 20;
   the rest stay queued. Run `make migrate` first.
1. **Config & schema** — already done. `make postgres-up && make migrate` (once
   `db/migrate.py` is implemented) creates the corpus tables.
2. **Vector store + embedder** — implement `embeddings/hashing.py` and
   `vectorstore/memory.py` first; they run fully offline and unlock tests.
3. **Ingestion** — `metadata.py` → `extract.py` (PyMuPDF, page-aware) →
   `chunk.py` → `pipeline.py`. Verify with `make seed && make ingest`
   (`BRH_VECTOR_BACKEND=memory BRH_EMBEDDING_PROVIDER=hashing` needs no cloud).
4. **Retrieval** — `retrieval/service.py` (+ `citations.py`). This is the shared
   core; get it right and everything above it is thin.
5. **Agent** — `prompts.py` → `nodes.py` → run `make agent-dev`.
6. **MCP** — register the tools in `services/mcp/src/brh_mcp/server.py`.
7. **Web** — `lib/agent.ts` (`useStream`) → chat UI → citation chips → PDF route
   and viewer.

## Run

```bash
cp .env.example .env          # fill in what each step needs
make install                  # uv sync --all-packages + bun install
make postgres-up              # metadata store
make migrate                  # apply the corpus schema (implement first)
make seed                     # copy the corpus into data/raw (sibling project)
make inventory                # discover + download BRH documents from brh.ht

make agent-dev                # LangGraph agent server   :2024
make mcp-dev                  # MCP server               :8000/mcp
make web-dev                  # Next.js                  :3000
```

## Conventions

- Every non-trivial decision is an ADR in [`docs/adr/`](docs/adr/).
- Imports stay inside the contract: surfaces use `RetrievalService`, never
  Pinecone/Postgres read paths directly.
- Tests run offline; live calls are `@pytest.mark.integration`.
- Frozen pydantic models; small focused files; type hints everywhere.

Read [`PROGRESSION.md`](PROGRESSION.md) at the start of a session.
