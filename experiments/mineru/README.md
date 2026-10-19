# MinerU — first OCR candidate

Run on **2026-10-18**, on a Google Colab T4, over the same six documents and 27
pages as the LlamaParse reference. Free tier, no API key.

| | |
|---|---|
| MinerU | 4.0.12 |
| Python | 3.12.3 (venv — see the first gotcha) |
| vLLM | 0.28.0 |
| torch | 2.13.0+cu130 |
| GPU | Tesla T4, 15 360 MiB, compute capability 7.5 |
| Command | `parse(pdf, tier="standard", ocr_mode="auto")` |

`standard` = small models + VLM (Qwen2-VL family), the tier comparable to
LlamaParse's `agentic`. `ocr_mode="auto"` reads the text layer where there is one
and OCRs where there is not.

## Result

**27 pages, 37 503 characters, 138 s** of inference for all six documents, after
one 90 s engine start. 6/6 documents succeeded.

| Document | Pages | Chars | Seconds |
|---|---:|---:|---:|
| `110b25ca` (2026 inflation note) | 10 | 11 490 | 113.0 |
| `63b4ca02` (2022 inflation note) | 9 | 12 145 | 5.0 |
| `f2d799b9` (2018 circular, scan) | 4 | 5 492 | 11.5 |
| `6ab9508c` (2022 circular, scan) | 2 | 4 935 | 5.2 |
| `1a84a9a7` (2018 circular, scan) | 1 | 1 505 | 2.9 |
| `f31dfee9` (wide financial table) | 1 | 1 936 | 0.8 |

The first document carries the engine start; the rest run at 0.8–11.5 s per
document, i.e. **~1 s per page** warm.

## Against the LlamaParse reference

Same metrics, same pages, both against the PDF text layer: word **F1** (content,
order-insensitive) and **WER** (order, rewrap-safe).

| | MinerU | LlamaParse |
|---|---:|---:|
| mean F1 | **0.907** | 0.885 |
| pages at F1 ≥ 0.98 | **10 / 18** | 7 / 18 |
| pages at WER ≤ 0.10 | 8 / 18 | 8 / 18 |

Where it matters most:

- **`f31dfee9` — the wide financial table: 1.000 F1, 0.000 WER.** Perfect. Five
  years of GDP-by-sector, cell for cell, as a markdown table.
- **`110b25ca` p9 — the two-column glossary: 0.997 / 0.006**, against 0.969 /
  0.065 for LlamaParse. Both read the columns correctly; MinerU is cleaner.
- **Charts remain hard for both.** `63b4ca02` p7 is 0.364 for MinerU against
  0.483 for LlamaParse; `110b25ca` p6 is 0.611 against 0.564. Neither is a
  transcription there, and the WER is meaningless on both.

## Two gotchas worth keeping

**Colab ships Python 3.13, and vLLM has no wheels for it.** `pip install
"mineru[full]"` then tries to build vLLM from source and appears to hang (no log
progress for 15+ minutes). Build a 3.12 venv first:

```bash
pip install -q uv
uv venv --python 3.12 /content/mvenv
uv pip install --python /content/mvenv/bin/python "mineru[full]>=4.0,<5"
```

**vLLM spawns its engine core, so the entry script must be guarded.** Without it
the child re-imports `__main__` and re-runs the parse:

```
RuntimeError: An attempt has been made to start a new process before the
current process has finished its bootstrapping phase.
```

Every script here ends in `if __name__ == "__main__":`. A notebook cell is already
inside a kernel, so it does not hit this — but `colab exec -f script.py` does.

Also: MinerU inlines page images as base64 into the markdown
(`![](data:image/jpeg;base64,…)`). One page was 63 486 chars, of which ~60 000 was
the raster. `run.py` collapses those to `![](image)`; without that the output is
unusable for text comparison.

## What the markdown drops

Reported against `f2d799b9` (the 2018 circular scan): the output has no
"CIRCULAIRE" heading and no number. That is true of the **markdown** — and it is
a rendering choice, not a reading failure. MinerU typed the letterhead and the
footer as such, and the markdown writer omits both:

```
page-1 blocks: header, header, doc_title, text, text, …, footer
  header     BRH
  header     Banque de la République d'Haiti / CIRCULAIRE / No 95-1A
  doc_title  AUX MAISONS DE TRANSFERT
  …
  footer     P.O. BOX 1570, Port-au-Prince, Haïti. Téléphone: …
```

So `raw/<sha>.json` has the letterhead verbatim and `raw/<sha>.md` does not. For
a corpus where the circular number is the citation anchor, **render from the
page tree, not from the markdown** — or re-add `header`/`footer` blocks when
writing markdown. `compare_ocr.py` scores the page tree for this reason.

## Reading the numbers

- The **T4 is old hardware** (compute 7.5): bf16 is unavailable, so vLLM falls back
  to fp16. A newer GPU would be faster, not necessarily more accurate.
- **WER on table pages is not a verdict.** The text layer serializes a table
  column-major (all row labels, then all values); MinerU emits row-major HTML.
  Same words, different order — which is why the reference excludes tables from
  the order score too.
- **`110b25ca` p2 scores WER 0.359 while F1 is 1.000**: it is a table of contents,
  and the md rebuilds it as a table, so the dot leaders and page numbers move.
  Content is perfect; order is a formatting decision.
- One run, one GPU, 27 pages. No repeated runs, no confidence intervals.

## Files

| File | |
|---|---|
| `raw/<sha256>.md` | MinerU's markdown, base64 images collapsed |
| `raw/<sha256>.json` | MinerU's page tree (`page_idx` → blocks → text/table) |
| `raw/results.json` | per-document status, chars, pages, seconds |
| `score.py` | reproduces the comparison table above |

## Reproduce

```bash
# once, on Colab
pip install -q uv
uv venv --python 3.12 /content/mvenv
uv pip install --python /content/mvenv/bin/python "mineru[full]>=4.0,<5"

# then, per run
/content/mvenv/bin/python /content/run.py     # downloads, verifies sha256, parses, zips

# locally, to re-score
cd experiments && uv run python mineru/score.py
```
