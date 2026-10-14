# Plan: BRH Intelligence scaffold (v2 re-architecture)

- **Date**: 2026-10-14
- **Status**: Scaffolded — implementation pending

## Why a v2

The sibling project (`../brh-intelligence-queryengine` + `-frontend`) proved the
core idea: retrieval over BRH PDFs with citations, streamed to a Next.js chat
UI, deployed on managed hosting. It is built on LlamaIndex + Qdrant→Pinecone +
a bespoke FastAPI SSE adapter.

BRH Intelligence widens the ambition — a *public research platform* plus a
*developer MCP surface* — and standardises on LangChain/LangGraph per the
brief. Reusing the sibling wholesale would carry its page-loss and
protocol-adapter constraints forward.

## What we keep from the sibling

- The **corpus**: 5 RDDCF volumes (PDFs + parsed Markdown). Seeds `data/raw`.
- The **Pinecone + integrated-inference** choice and the `search_records`
  wrapper pattern (its response-shape tolerance is a real lesson).
- The **Postgres-as-system-of-record** design (its proposed ADR-0030), trimmed
  to what a citation needs.
- UI/UX instincts from its frontend (citations, empty state, French copy).

## What we change

| Concern | Sibling | Here | ADR |
|---|---|---|---|
| Agent framework | LlamaIndex ReActAgent | LangGraph `StateGraph` | 0002 |
| Page provenance | none (Markdown lost pages) | PyMuPDF per-page, `#page=N` links | 0005 |
| Frontend transport | AI SDK `useChat` + SSE adapter | LangGraph SDK `useStream` | 0008 |
| Embeddings | fixed HF `multilingual-e5-large` | configurable provider | 0004 |
| Retrieval | inside the ReAct tool | explicit `RetrievalService` | 0006 |
| MCP | none | FastMCP server, same core | 0007 |
| Deploy | Modal/Render | LangSmith Deployment + Vercel | 0009 |

## Scope of this scaffold

**Real (ready to use):**

1. `brh_core` — `config.py` (env plumbing), `models.py` (frozen domain model),
   `db/migrations/0001_init.sql` (the corpus schema), and the `VectorStore` /
   `Embedder` protocols.
2. `brh_agent` — the graph wiring (`retrieve → generate | refuse`) and typed
   state.
3. `brh_mcp` — a `FastMCP` server shell with instructions; tools to add.
4. `apps/web` — a buildable Next.js app with the `AgentState`/`Citation`
   contract and the PDF/viewer plan documented.
5. Documentation: 10 ADRs, system overview, this plan, a deploy runbook.
6. Tooling: uv + bun workspaces, Make targets, docker-compose, smoke tests.

**Stubbed (signatures + `TODO`):** every module body — storage, vector stores,
embedders, ingestion, retrieval, agent nodes/prompts/LLM, MCP tools, web chat.
See the build order in `README.md`.

**Out (named, not built):** crawler/autodiscovery of `brh.ht`, Creole/English,
indicator comparison, multi-agent research, auth on MCP, reranking, session
memory, evaluation harness.

> A complete working implementation was built first and reduced to this scaffold
> on request. It is preserved on the branch `reference/full-implementation`.

## Design rules carried in

- One reliable workflow first; breadth is roadmap.
- Every non-trivial decision gets an ADR.
- Frozen pydantic models; small focused files; type hints everywhere.
- Tests run offline by default; live calls are `@pytest.mark.integration`.
- Retrieval has exactly one implementation, shared by all surfaces.

## Open questions (for the next session)

- Pinecone index provisioning: confirm integrated inference + dimension.
- Retrieval threshold: what score makes the refusal branch fire? Needs a small
  labelled set.
- Should `pages` text live in Postgres, Pinecone metadata, or both? Today:
  Postgres is authoritative, a summary goes to Pinecone for display.
