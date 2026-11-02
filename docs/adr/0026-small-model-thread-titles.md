# ADR 0026: A small model for thread titles

Status: accepted. Date: 2026-11-01.

The assistant needs an independently configurable small model for lightweight
work. The first completed turn generates a concise French title using a separate
OpenRouter-compatible model configured with `BRH_SLM_BASE_URL`, `BRH_SLM_MODEL`,
`BRH_SLM_TIMEOUT` and `BRH_SLM_MAX_TOKENS`; it shares `OPENROUTER_API_KEY`.
The title is stored in graph state and generated only while missing. Failure is
non-fatal and the UI retains its first-question fallback. This model role does
not implement ontology extraction, and is independent of the chat and decision
roles. Title generation runs after answer publication, so a slow provider can
extend the run even though the answer is already visible.
