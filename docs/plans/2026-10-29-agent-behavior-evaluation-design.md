# Agent behavior evaluation — design

**Status:** Implemented initial contract set; factual gold-answer review remains open.

## Purpose

The live acceptance run exposed nondeterministic Jev plan and grounding
judgments that mocked workflow tests could not observe. The evaluation must
measure the shipped UI-facing Agent Server repeatedly while separating provider
availability from behavior quality.

## Decision

Keep a reviewed French JSONL dataset under `services/agent/evals/` and mirror
each immutable version into Arize AX. One experiment task executes each case
three times sequentially. Code-based Arize evaluators score the expected route,
plan shape, goal count, citation policy, explicit-number preservation, model
budget, repeated-run stability and transport availability.

Jev is part of the system under test and never judges itself. The evaluators are
deterministic. Git remains the reviewable source of truth; Arize stores dataset
versions, experiment runs and score history. Production traces remain redacted,
while the curated non-sensitive evaluation prompts and outputs are intentionally
visible in the Arize evaluation project.

## Alternatives considered

- Arize-only cases were rejected because changes would not receive normal code
  review or remain reproducible from a clone.
- One experiment per repetition was rejected because variance would be split
  across runs instead of being visible as a per-case stability score.
- LLM-as-judge scoring was deferred because the immediate regression is itself
  an unstable decision-model judgment. Factual gold answers may later add an
  independently reviewed semantic evaluator.

## Boundaries

The initial set is a graph-contract benchmark, not a factual-accuracy claim.
Live execution is opt-in and requires the Agent Server, corpus, OpenRouter and
Arize credentials. Dataset validation and scorer regression tests remain fully
offline.
