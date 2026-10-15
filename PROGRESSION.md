# Progression

Last updated: 2026-10-14 (BRH document inventory implemented)

Working state of BRH Intelligence. **Read at session start.** Update when you
start, finish, or pivot a task, and when a non-obvious learning surfaces.

## Active

- **BRH inventory (front half) is implemented** — `make inventory` catalogues
  every PDF on `brh.ht` (the ledger lists the whole corpus, pending or resolved)
  and downloads the missing ones content-addressed into `data/raw/web/`.
  Idempotent: the download queue is the unresolved rows, so bounded runs advance
  and failures are retried.
- The rest of the repo is still a scaffold: structure, contracts, config, and
  wiring only. See the build order in [`README.md`](README.md).

## Next up

Continue the build order:

1. `embeddings/hashing.py` + `vectorstore/memory.py` — offline embedder and
   vector store, so tests can run with no cloud.
2. `db/repository.py` — corpus documents/pages/chunks read/write (pool and
   migrate are done; run `make postgres-up && make migrate`).
3. Ingestion: `metadata.py` → `extract.py` → `chunk.py` → `pipeline.py`, fed by
   the files the inventory has already downloaded. Verify with `make ingest`.

## Recently done

- **2026-10-14 — BRH document inventory.** `brh_core.inventory`: discover PDFs
  via the WordPress media API, download into `data/raw/web/<sha256>.pdf`, log
  every URL in `corpus.crawl_urls` (dates + status + hash) with a run history in
  `corpus.crawl_runs`. Each run catalogues the whole site first, so the ledger
  lists every PDF whether or not it has been downloaded. Verified against the
  live site + Postgres; covered offline in
  `packages/core/tests/test_inventory.py`.
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
- `brh.ht` is WordPress: enumerate documents through
  `wp-json/wp/v2/media?mime_type=application/pdf`, **not** `media_type=...`
  (that rejects `pdf` with HTTP 400 — the sibling project's doc is wrong).
  Incremental discovery is the `modified_after` parameter.
- `brh.ht` file responses carry `Last-Modified` + `Content-Length` but **no
  `ETag`**, so a cheap re-check is `(last_modified, content_length)`; the real
  identity is the `sha256` computed after download. The same bytes appear at
  more than one URL, so a file's URL is not its identity.
- The inventory's download queue is *derived*, not a stored cursor: it is the
  rows whose status is not resolved (`pending`/`failed`, ordered by
  `wp_modified`). So a bounded run advances, a failure is simply still queued,
  and a document that changes is re-queued (its `wp_modified` moves). Each run
  re-catalogues the whole site first, so the ledger always lists every URL.
