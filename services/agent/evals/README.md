# Agent behavior evaluations

This folder is the reviewed acceptance surface for the shipped LangGraph agent.
It is not part of `experiments/`: these cases encode product behavior and run
against the same `/runs/wait` contract used by the web application.

`dataset.jsonl` is the Git source of truth. The versioned
`brh-agent-behavior-v4` dataset is the new local contract; remote sync is opt-in.
Each Arize experiment row
runs the case three times and records three independent scores:

- `BehaviorContractEvaluator`: expected route, plan mode and goal count,
  citation policy, explicit-number preservation and model-call ceiling;
- `StabilityEvaluator`: whether repeated trials produce the same behavior
  signature;
- `AvailabilityEvaluator`: transport/API success, kept separate from quality.

The initial set tests routing and grounding contracts. It does **not** certify
factual correctness; factual-answer gold labels require separate human review.
Curated prompts and model answers are intentionally uploaded to the evaluation
dataset/experiment. Production tracing remains content-redacted under ADR-0018.

From the repository root:

```bash
make agent-eval ARGS="validate"
make agent-eval ARGS="sync"
make agent-eval ARGS="run --repetitions 3"
make agent-eval ARGS="run --dry-run --repetitions 1"
```

`sync` is non-destructive: it creates `brh-agent-behavior-v4` when absent and
otherwise reuses it. Change the dataset name/version when reviewed cases change;
do not silently overwrite a dataset used by existing experiments.
