# ADR-0020: Smaller graph with model-directed research and responses

- **Status**: Accepted
- **Date**: 2026-10-29
- **Extends**: ADR-0017 and ADR-0019

## Context

The initial graph exposed separate nodes for plan repair, answer repair,
conversation, clarification and four terminal outcomes. It always refined missing
coverage and selected prewritten refusals. This increased graph surface without
giving the models useful discretion.

Context7 documentation for LangGraph routing, evaluator/optimizer workflows,
checkpointing and LangChain messages informed this change. Primary guidance:

- [LangGraph workflows and agents](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [LangGraph memory](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [LangGraph checkpointers](https://docs.langchain.com/oss/python/langgraph/checkpointers)
- [LangChain messages](https://docs.langchain.com/oss/python/langchain/messages)
- [Building effective agents](https://www.anthropic.com/research/building-effective-agents)

These sources support structured model routing and simple composable workflows.
The particular balance below is our application design, not a framework mandate.

## Decision

- Keep 12 execution nodes: prepare, route_intent, plan, validate_plan, schedule,
  search_goal, assess_coverage, refine, draft, validate_answer, respond and publish.
- Reuse plan and draft for at most one repair each. Keep repair counters and
  deadlines in state so checkpoints retain the bound.
- Jev selects conversation/research/scope and, after retrieval, refine/draft/respond.
  Code caps refinement at one and prevents drafting without supported evidence.
- One chat response task writes conversation, clarification and limitation text
  using the shared system identity. Jev reviews it before publication. Schema,
  provider, budget and input failures retain deterministic technical outcomes.
- Preserve claim validation and canonical citation assembly for factual answers.
- Keep thread memory in `add_messages` checkpoints owned by Agent Server. Pass
  bounded real message roles to the chat model; keep internal prompts ephemeral.
  Standalone callers must supply their own checkpointer and thread ID. No legacy
  ConversationBufferMemory or shared global user-memory store is introduced.
- Version the local behavior dataset as v4 for the response-review call and
  no-plan scope path. Remote dataset synchronization and repeated quality runs
  are separate operations.

## Consequences

Execution nodes decrease from 19 to 12 (excluding START/END). Models control semantic choices and wording;
code still controls execution, structural validity and publication. A greeting
uses three model calls: routing, response and review. The additional review also
protects model-written limitations from becoming unsupported factual answers.
This remains a bounded adaptive research workflow rather than an unrestricted
tool-calling agent. Live quality must be evaluated separately from offline tests.
