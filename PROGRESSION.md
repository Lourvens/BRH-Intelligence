# Progression

Last updated: 2026-10-14 (scaffold only — implementation not started)

Working state of BRH Intelligence. **Read at session start.** Update when you
start, finish, or pivot a task, and when a non-obvious learning surfaces.

## Active

- Nothing implemented. The repo is a scaffold: structure, contracts, config,
  and wiring only. See the build order in [`README.md`](README.md).

## Next up

Follow the build order. Suggested first three, each verifiable offline:

1. `embeddings/hashing.py` + `vectorstore/memory.py` — offline embedder and
   vector store, so tests can run with no cloud.
2. `db/migrate.py` + `db/pool.py` + `db/repository.py` — apply the schema and
   make the corpus queryable (`make postgres-up && make migrate`).
3. Ingestion: `metadata.py` → `extract.py` → `chunk.py` → `pipeline.py`.
   Verify with `make seed && make ingest`.

## Recently done

- **2026-10-14 — Scaffold.** Monorepo (uv workspace: `brh-core`, `brh-agent`,
  `brh-mcp`; bun workspace: `apps/web`). Real: config, domain model, SQL schema,
  `VectorStore`/`Embedder` protocols, graph wiring, MCP server shell, tooling,
  Make targets, 10 ADRs. Stubbed with `TODO`: all logic.
- **2026-10-14 — A full working implementation exists on the branch
  `reference/full-implementation`.** It was built first, then reduced to this
  scaffold at the author's request. Use it as a reference while implementing,
  or delete the branch (`git branch -D reference/full-implementation`) if you'd
  rather not have it.

## Backlog / out of scope for now

- Autodiscovery crawler for `brh.ht` (Firecrawl).
- Haitian Creole + English surfaces (docs are French-only for now).
- Indicator comparison / structured tables as a first-class query type.
- Session persistence + follow-up memory (LangGraph checkpointer on Postgres).
- Auth + rate limiting for the public MCP server.
- Serve source PDFs from object storage instead of through the web app.
- Evaluation harness (French Q/A over RDDCF, recall@k + groundedness).
- Reranker once we have retrieval failures to point at.

## Gotchas

- The sibling corpus (`brh-intelligence-queryengine/data/processed/*.md`) has
  **no page markers** (`pages: null` in its manifest). Do not rely on it for
  page-level citations — extract page-aware text from the PDFs yourself
  (ADR-0005). This is the single most important lesson carried over.
- Page numbers must be **1-based** and match the PDF viewer's `#page=N`.
- `langgraph dev` loads `langgraph.json`'s `env` file, which **overrides**
  exported shell env vars. To test against the offline backend, edit `.env`,
  not the shell.
- Pinecone's **records API** (`upsert_records` / `search_records`) is what
  integrated-inference indexes use; the plain `upsert`/`query` API needs
  client-computed vectors.
- `multilingual-e5-large` has a ~512-token (~2K char) ceiling; chunks above it
  are silently truncated at embed time. Keep `chunk_size` well under it
  (default 1000 chars).
