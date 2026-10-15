# experiments

Notebooks for **spikes and option analysis** — decide before you implement.

Each notebook answers one decision question by comparing a few options against
a metric, and ends with the chosen option + the trade-off. If the decision is
non-trivial, write it up as an ADR in `../docs/adr/` and link it from the
notebook.

## Run

```bash
make lab        # from the repo root: syncs this env and opens JupyterLab
```

This is a standalone uv project, so its notebook dependencies never touch the
app runtime. `experiments/.venv` and `artifacts/` are gitignored.

## Notebooks

| Notebook | Question |
|---|---|
| `0001-pdf-extraction.ipynb` | Which PDF extractor gives page-accurate text? |
| `0002-brh-discovery.ipynb` | How do we enumerate every document on `brh.ht`, how big is the corpus, and how does a scheduled job ask "what changed?" |

Copy `0001` as a starting point for the next experiment. Name new ones
`NNNN-topic.ipynb`.
