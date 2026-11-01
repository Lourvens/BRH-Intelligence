# ADR 0023: Fresh routed document assistant

- Status: implemented foundation, pending live verification
- Date: 2026-10-30

## Context

The previous agent was removed for a restart. The assistant needs inexpensive
conversational handling and evidence-based research over the existing BRH
corpus, while preserving the LangGraph SDK message contract.

## Decision

A decision model routes each turn using recent conversation history. Greetings,
capabilities, out-of-scope requests and clarifications use a chat response without
retrieval. Documentary questions enter a bounded model-directed tool loop. A
LangChain tool delegates to the shared `RetrievalService`, with exact document ID
and page filters. Its output carries canonical passages and citations. Each agent
has its own package; the shared French identity and graph state stay at the root.
The graph publishes assistant messages with the existing UI envelope and emits
custom activity events. The hosting platform owns production checkpointing;
in-memory checkpoints are suitable for offline tests only. Arize instrumentation
is optional and content capture remains explicitly configured.

## Limits and consequences

The tool does not yet provide year or document-family filters: those require a
shared-core passage-search interface, rather than bypassing `RetrievalService`.
Citation marker validation checks that references exist; it does not establish
claim-level factual support. The UI receives activity and final published
messages, not streamed answer tokens. The Jev request, live retrieval, Arize
export, and hosted checkpointing still require end-to-end verification. No
previous trace or evaluation data is changed by this decision.
