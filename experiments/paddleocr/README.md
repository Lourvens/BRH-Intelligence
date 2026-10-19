# PaddleOCR-VL — third OCR candidate

Run on **2026-10-18** on the same Colab T4, over the same six documents and 27
pages.

| | |
|---|---|
| PaddleOCR | 3.7.0 (`paddleocr[doc-parser]`) |
| PaddleOCR-VL | 0.9B, via `PaddleOCRVL(engine="transformers")` |
| Python | 3.13.15 (Colab's own) |
| Output | per-page markdown, one file per page |

`engine="transformers"` runs both the layout model and the VLM through torch,
which Colab already has — no Paddle GPU wheel, no vLLM. Page breaks come free:
PaddleOCR-VL processes a PDF page by page.

## Result

**6/6 documents, 68 948 characters, 401.1 s** — the slowest of the three.

| Document | Pages | Chars | Seconds |
|---|---:|---:|---:|
| `110b25ca` (2026 inflation note) | 10 | 22 734 | 127.9 |
| `63b4ca02` (2022 inflation note) | 9 | 21 566 | 119.3 |
| `f2d799b9` (2018 circular, scan) | 4 | 8 526 | 65.2 |
| `f31dfee9` (wide financial table) | 1 | 9 409 | 28.8 |
| `6ab9508c` (2022 circular, scan) | 2 | 5 065 | 43.2 |
| `1a84a9a7` (2018 circular, scan) | 1 | 1 648 | 16.7 |

~15 s/page warm. It produces the most text of the three (69 k chars), largely
because tables come out as HTML with inline styles.

## Four engines, same eighteen born-digital pages

| | LlamaParse | MinerU | Docling | PaddleOCR-VL |
|---|---:|---:|---:|---:|
| mean word F1 | 0.885 | **0.907** | 0.895 | 0.906 |
| pages at F1 ≥ 0.98 | 7 / 18 | 10 / 18 | **11 / 18** | 10 / 18 |
| pages at WER ≤ 0.10 | 8 / 18 | 8 / 18 | **9 / 18** | 8 / 18 |

PaddleOCR-VL lands within 0.001 of MinerU on mean F1 and is the equal-best on
WER. Its weak spot is the same one everyone has — charts (`63b4ca02` p7: 0.340,
the lowest of the four) — and it matches the field on the wide table
(`f31dfee9`: 0.983 / 0.025 against MinerU's 1.000 / 0.000).

## The scan: clean body, missing letterhead

`f2d799b9` page 1:

```
AUX MAISONS DE TRANSFERT
Conformément au paragraphe premier de l'article 2.1.2 de la loi du 21 février 2001 …
```

Clean prose — far better than Docling's `declarntions` / `circulairc` /
`trnnsfert` — but the `BANQUE DE LA RÉPUBLIQUE D'HAÏTI / CIRCULAIRE / No 95-1A`
block is gone, exactly as in MinerU's markdown. Both engines classify it as a
header block and both drop it on export. Only LlamaParse keeps it, and Docling
loses it by mis-reading rather than by filtering.

## Clean output: no markup for a browser

PaddleOCR writes HTML for tables (`style='text-align: center; word-wrap:
break-word;'` on **every cell**) and wraps captions in `<div style=…>`. That is
presentation, and nothing downstream wants it. `clean.py` fixes it:

| | before | after |
|---|---|---|
| whole set | 68 948 chars | **40 452 (59%)** |
| `<` occurrences | 1 455 | **897** |
| the two chart documents | 64 504 chars | **28 754 (45%)** |

Rules, the same shape foil-serve uses:

- **figures are copied** to `<out>/assets/<sha256>/pNNN/` and rewritten as
  markdown `![](assets/…)`, so the output directory is self-contained. PaddleOCR
  points them at `imgs/…`, which only exists inside each page's own folder and is
  dead once the pages are merged. `--drop-images` skips the copy instead;
- `<div>` wrappers become plain paragraphs;
- a table becomes a **pipe table** when it is simple — no `colspan`/`rowspan`, no
  nested table, every row the same width;
- anything else keeps its HTML but loses every attribute, because dropping a
  merged cell would lose meaning;
- runs of blank lines collapse, and HTML entities are unescaped (`&#x27;` → `'`,
  which also removes the stray `x27` tokens the raw markdown leaked).

Figures: **14 copied** from the six documents, 0 broken links, 888 kB including
the assets.

Five tables stay HTML — and not because of merged cells (there are none in this
set). Their rows simply have different cell counts (`110b25ca` has a table with
rows of 3, 4 and 5 cells). Padding them to a common width would silently shift
values by a column, so the structure is kept and only the styling is dropped.

The wide financial table comes out as the thing LlamaParse produced:

```
|   | 2020-2021 | 2021-2022 | 2022-2023 | …
| --- | --- | --- | --- | …
| Agriculture, sylviculture et pêche | 99,473 | 94,954 | 89,655 | …
```

`uv run python paddleocr/clean.py` cleans `raw/`; pass a directory to clean
something else (`clean.py charts` → `charts_clean/`).

## Charts: yes, with `use_chart_recognition=True`

Off by default. Turned on, a chart is read as data instead of as a picture with
axis labels — `63b4ca02` p7 becomes 20 rows:

```
| Date   | Infl_m | Infl_y |
| --- | --- | --- |
| Oct-19 | 1.8    | 2.5    |
| Dec-19 | 1.7    | 2.6    |
…
| Oct-22 | 11.0   | 47.2   |
| Dec-22 | 5.7    | 57.9   |
```

Effect on the two chart pages, scored against the text layer as before:

| Page | F1 off | F1 on | WER off | WER on |
|---|---:|---:|---:|---:|
| `63b4ca02` p7 | 0.340 | **0.428** | 0.794 | 0.921 |
| `110b25ca` p6 | 0.646 | **0.754** | 0.528 | 0.814 |
| `63b4ca02` p6 (no chart) | 0.996 | 0.996 | 0.005 | 0.005 |

Content improves and WER rises, which is the expected signature: the recovered
series is *new* text, absent from the text layer, so an order metric charges for
it. A chart page should be scored on whether the series came back, not on WER —
and it did, 20 of 20 points.

Cost: `110b25ca` took 171 s with charts against 128 s without, and produced 36 478
chars against 22 734 (before cleaning).

**Recommended configuration** for the corpus:

```python
PaddleOCRVL(engine="transformers", use_chart_recognition=True)
# then paddleocr/clean.py over the result
```

## Against its published benchmark

PaddleOCR-VL-1.5 is **SOTA on OmniDocBench v1.5 at 94.5%** (MinerU2.5: 90.67,
PaddleOCR-VL 0.9B v1: 92.86). On our 18 pages it is level with MinerU, not ahead
— a reminder that OmniDocBench is mostly Chinese and English and weights
formulas and tables, while this corpus is French, table-heavy and partly scanned.

## Two practical notes

- **Tables are HTML, with inline styles on every cell**
  (`<td style='text-align: center; word-wrap: break-word;'>`). That is valid but
  verbose, and it broke my first scoring run: `markdown_to_text` does not strip
  tags, so every cell contributed `style text align center word wrap break word`
  to the word counts and WER hit 4.0. `compare_ocr.py` now strips tags before
  scoring — for every engine, which is why Docling's numbers moved too.
- **`save_to_markdown` writes one file per page**, named after the input; that is
  what `run.py` reads back. `restructure_pages(merge_tables=…, relevel_titles=…)`
  is available if you want cross-page tables merged, but it destroys the
  one-file-per-page mapping this comparison depends on.

## Files

| File | |
|---|---|
| `raw/<sha256>.md` | per-document markdown, pages joined with `<!-- pagebreak -->` |
| `raw/pages/<sha>/pNNN/` | PaddleOCR's native output: `<sha>_N.md` (N is 0-based) + `imgs/` |
| `raw/results.json` | per-document status, chars, pages, seconds |
| `clean/<sha256>.md` | the deliverable: pipe tables, no styling, working image links |
| `clean/assets/<sha>/pNNN/` | the figure crops those links point at |
| `charts/` · `charts_clean/` | the `use_chart_recognition=True` pass, same layout |
| `run.py` · `smoke.py` · `clean.py` | the VM runner, the one-page check, the cleaner |

## Reproduce

```bash
pip install "paddleocr[doc-parser]" "transformers>=5.0.0"
python run.py
cd .. && uv run python compare_ocr.py
```
