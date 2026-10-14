# Architecture Decision Records

Every non-trivial decision in BRH Intelligence gets an ADR here. Each follows
the Nygard template — **Context → Decision → Consequences** (plus
*Alternatives considered* where it earns its keep). Read the *Consequences*
before questioning a decision; that is where the trade-off lives.

To add one: pick the next number, copy the shape of an existing file, and add a
row to the index below.

## Index

| ADR | Title | Status |
|---|---|---|
| [0001](0001-monorepo-layout.md) | Monorepo with a Python + JS split | Accepted |
| [0002](0002-langgraph-for-the-agent.md) | LangGraph for the agent | Accepted |
| [0003](0003-postgres-metadata-plus-pinecone-vectors.md) | Postgres for metadata, Pinecone for vectors | Accepted |
| [0004](0004-configurable-embeddings.md) | Configurable embeddings, French-first corpus | Accepted |
| [0005](0005-page-aware-ingestion.md) | Page-aware ingestion with PyMuPDF | Accepted |
| [0006](0006-retrieval-service-as-shared-core.md) | Retrieval service as the shared core | Accepted |
| [0007](0007-mcp-server-shared-retrieval.md) | MCP server over the same retrieval | Accepted |
| [0008](0008-langgraph-sdk-frontend.md) | Frontend consumes the graph via the LangGraph SDK | Accepted |
| [0009](0009-langsmith-observability-and-deploy.md) | LangSmith for observability and deploy | Accepted |
| [0010](0010-provider-agnostic-llm.md) | Provider-agnostic LLM configuration | Accepted |
