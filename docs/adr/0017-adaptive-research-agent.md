# ADR-0017: Adaptive research with separate chat and decision models

- **Status**: Accepted (user requested implementation, 2026-10-28)
- **Date**: 2026-10-28
- **Extends**: ADR-0002 and ADR-0010

## Decision

Use a bounded LangGraph workflow: prepare, Jev route selection, structured plan
and Jev plan validation, `Send` research workers, evidence merge, Jev coverage assessment,
one missing-goal refinement, chat drafting, citation checks and Jev support
review, one repair, then publication. Clarification ends the current turn.

OpenRouter Ministral writes query rewrites, plans, conversational replies and
answers. Jev first selects `conversation`, `plan` or `out_of_scope`; on the plan
path it also validates clarification and direct/decomposed research plans. It
uses the separate Decisions API for typed choices and judgments;
it cannot generate query text or plans. `BRH_CHAT_*` and `BRH_DECISION_*` configure
the roles; `OPENROUTER_API_KEY` authenticates both independently of embeddings.
Legacy `BRH_LLM_*` remains available without overriding explicit roles.

Limit each turn to four goals, two queries per goal, one plan repair, one query
refinement and one answer repair. Enforce total call, evidence, input and elapsed
time budgets. Independent searches run in parallel; results use an idempotent
keyed reducer, reset with `Overwrite` at the start of each turn.

Only `RetrievalService` supplies evidence and citations. The chat model selects
opaque evidence IDs; code resolves page citations and assembles claim-local
markers. Jev reviews semantic support; this needs evaluation and is not a
calibrated guarantee. Empty retrieval, partial support and outages are distinct.

Publish one final AI message with versioned citation metadata. The frontend uses
the existing LangGraph SDK and renders published messages, including citations
reloaded from checkpoints. Agent Server owns persistence; the process owns lazy
provider clients and its retrieval pool. Imports perform no network calls.

## Consequences

More model calls than the fixed chain, but bounded routes support compound
queries and follow-ups. Numerical/graph artifacts remain deferred. Anonymous
deployments require session/thread access controls before public exposure.

## References

- [LangGraph workers](https://docs.langchain.com/oss/python/langgraph/workflows-agents)
- [Context7 graph API](https://docs.langchain.com/oss/python/langgraph/use-graph-api)
- [Jev contract](https://openrouter.ai/blog/tutorials/how-to-use-jev/)
