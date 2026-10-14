# ADR-0001: Monorepo with a Python + JS split

- **Status**: Accepted
- **Date**: 2026-10-14

## Context

The platform spans an AI agent (LangGraph), a public web interface (Next.js),
a developer-facing MCP server, and a document-ingestion pipeline. All four
share one domain model: documents, pages, chunks, citations. The agent and the
MCP server must answer from *the same* retrieval, or the platform's promise
("grounded in official documents") drifts between surfaces.

The team is small. Splitting into independent repos means duplicated CI,
versioned contracts between them, and a real risk that the MCP server and the
agent slowly diverge on retrieval semantics.

## Decision

One git repository containing:

- `packages/core/` — a Python package (`brh_core`) with the domain model,
  ingestion, retrieval, and storage adapters. **The single source of truth.**
- `services/agent/`, `services/mcp/` — Python services that depend on core.
- `apps/web/` — the Next.js app.

The Python side is a **uv workspace** (one lockfile, `uv sync --all-packages`).
The JS side is a **bun workspace**. The two toolchains are independent; the
only coupling is HTTP at runtime.

## Consequences

Easier:

- The agent and MCP server import the same `RetrievalService`. One
  implementation of truth.
- Atomic changes across surfaces (a citation-schema change lands in one commit).
- One `make` front door for a small team.

Harder:

- Contributors need both toolchains. Mitigated by `make install` and keeping
  the Python and JS trees genuinely separate.
- Repo size grows. Contained by gitignoring `data/` and build output.

## Alternatives considered

- **Separate repos per surface.** Rejected: coordination cost and retrieval
  drift outweigh the isolation, at this team size.
- **Single-language monorepo (TS only).** Rejected: LangGraph's Python
  ecosystem is the stronger fit for document work and MCP tooling (see
  ADR-0002).
