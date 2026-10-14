# Deployment runbook

Targets: **Next.js on Vercel**, **agent + MCP on LangSmith Deployment / a
container**, **Postgres managed**, **Pinecone serverless** (ADR-0009).

## 0. Provision

1. **Pinecone** — create a serverless index with **integrated inference**:
   - model `multilingual-e5-large`, dimension `1024`, metric `cosine`
   - record the index name for `BRH_PINECONE_INDEX_NAME`
   - (or create a plain index and set `BRH_VECTOR_BACKEND=pinecone` +
     `BRH_EMBEDDING_PROVIDER=openai`)
2. **Postgres** — any managed Postgres 15+. Run the migration once
   (`python -m brh_core.db.migrate`).
3. **LangSmith** — a project + API key for tracing
   (`LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT`).

## 1. Ingest

From a machine with the corpus in `data/raw/`:

```bash
export BRH_PINECONE_API_KEY=...
export BRH_PINECONE_INDEX_NAME=...
export BRH_POSTGRES_HOST=... BRH_POSTGRES_PASSWORD=...
python -m brh_core.db.migrate
python -m brh_core.ingestion        # writes pages/chunks + vectors + catalog.json
```

Serve `data/processed/catalog.json` and the PDFs to the web app (see §3).

## 2. Agent (LangGraph)

```bash
cd services/agent
langgraph deploy        # or push via LangSmith Deployment
```

Required env: `BRH_*` (as in `.env.example`), `ANTHROPIC_API_KEY`,
`LANGCHAIN_API_KEY`. The `langgraph.json` graph id is `agent`.

## 3. Web (Vercel)

- Set `NEXT_PUBLIC_LANGGRAPH_URL` to the deployed agent URL.
- The PDF route reads `data/processed/catalog.json` and the source PDFs. In a
  Vercel deployment these must be reachable: either bundle a read-only copy, or
  point `BRH_DATA_DIR` at a mounted/object-storage path. Simplest production
  option: serve PDFs from object storage and set each citation's URL instead of
  proxying through the app (a follow-up — see `PROGRESSION.md`).

## 4. MCP

Run the container and expose `:8000/mcp`:

```bash
python -m brh_mcp --host 0.0.0.0 --port 8000
```

**Auth is not wired yet** (ADR-0007). Put it behind a gateway/API key before
making it public.

## Health checks

| Surface | Check |
|---|---|
| Agent | `GET {langgraph}/ok` |
| MCP | `GET {mcp}/mcp` (expects MCP headers; 400 on a bare GET is healthy) |
| Web | `GET /` (200) |
| Corpus | `python -c "from brh_core...; print(stats())"` or `corpus_stats` MCP tool |
