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
| `0003-mineru-ocr.ipynb` | Can MinerU be the OCR stage for the French corpus — on Colab, without a local GPU? |

Copy `0001` as a starting point for the next experiment. Name new ones
`NNNN-topic.ipynb`.

## OCR candidates

Notebooks answer the question; the runs that actually happen live beside them,
with their output committed so the numbers can be re-derived.

| Folder | What it holds |
|---|---|
| `mineru/` | MinerU 4.0.12 on a Colab T4 — raw markdown/JSON, `score.py`, and the comparison against the LlamaParse reference |
| `docling/` | Docling 2.140.0 on the same T4 — raw markdown/JSON and the runs it produced |
| `paddleocr/` | PaddleOCR-VL 0.9B (transformers engine) — per-page markdown and the run it produced |
| `compare_ocr.py` | LlamaParse vs MinerU vs Docling vs PaddleOCR-VL on the same pages, plus the scan check |

`0003-mineru-ocr.ipynb` is the self-serve path for the same test; the run that
produced `mineru/` was driven headlessly over SSH-less `colab` CLI. The notebook
predates two things we only found by running it — the Python 3.12 venv and the
`if __name__ == "__main__"` guard — both documented in `mineru/README.md`.
