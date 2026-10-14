# ADR-0007: MCP server over the same retrieval

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

A core part of the vision is *the developer interface*: other people's AI
agents should be able to use BRH knowledge through **MCP**. If that surface
implements its own search, it will drift from the product's answers.

## Decision

Ship an MCP server (`services/mcp`, Python, FastMCP) that exposes the
**same** `RetrievalService` (ADR-0006) as tools:

| Tool | Purpose |
|---|---|
| `search_documents(query, top_k)` | Grounded passages with citations |
| `get_document(document_id_or_slug)` | Document metadata + page count |
| `get_page(document_id_or_slug, page_number)` | Full text of one page |
| `list_documents()` | The corpus inventory |

It runs as a standalone streamable-HTTP service. It is in the same uv
workspace as the agent, importing `brh_core` directly — no HTTP call to the
agent, no duplicated logic.

## Consequences

Easier:

- The MCP tools and the agent answers cite the same evidence.
- One Python codebase for both services.

Harder:

- The MCP surface needs its own auth and rate limiting before it is public.
  Tracked as a backlog item; not wired in v1.
- Tool schemas are a public contract. Changes need care and versioning.

## Alternatives considered

- **A TypeScript MCP server.** Rejected: it would duplicate the retrieval
  layer and risk divergence.
- **Fold MCP tools into the LangGraph deployment.** Rejected: MCP is a
  distinct protocol and audience; a separate process keeps it independently
  deployable and testable.
