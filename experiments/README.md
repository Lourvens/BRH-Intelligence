# experiments

Notebooks for **spikes and option analysis** — decide before you implement.

Each notebook answers one decision question by comparing a few options against
a metric, and ends with the answer and its trade-off.

**Nothing here ships.** A result is a recommendation until it is signed off, and
only then does it become an ADR, a test, and an implementation in `packages/` or
`services/`. Shipped code must never import from `experiments/`, and a `.py`
here is the experiment or its runner — never the product. The full rule is in
[`../AGENTS.md`](../AGENTS.md#experiments-are-not-code).

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
| `0004-chunking-strategies.ipynb` | Where inside a page should ingestion cut a passage? Nine LangChain splitters over the OCR corpus, three seeds, offline. |
| `0005-corpus-structure.ipynb` | Do headings, captions, units, series and provisions actually exist in the OCR Markdown, and how big is each against a 500-token cap? Writes `chunking/corpus-stats.json`. |

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

## Chunking

`chunking/` holds only committed artefacts: `results.json` (every arm × regime ×
metric, 3 seeds) and `REPORT.md` (the tables and the leading candidate). The
experiment itself is `notebooks/0004-chunking-strategies.ipynb`; it re-derives
`results.json` in about five minutes with no key and no network.

**No decision is recorded yet.** The ingestion chunker is still a stub on
purpose — see [`../AGENTS.md`](../AGENTS.md#experiments-are-not-code).

`chunking/corpus-stats.json` is the structural measurement of the OCR corpus
(778 documents, 11 628 pages) that the design rests on: section and table size
distributions, how often a caption/unit/source sits with a table, how many
tables are series-shaped, and how provisions are actually marked. Token figures
in it are **estimates** (`chars_per_token = 4.0`) until the production tokenizer
replaces that constant.
