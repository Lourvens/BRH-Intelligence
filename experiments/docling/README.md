# Docling — second OCR candidate

Run on **2026-10-18** on the same Colab T4, over the same six documents and 27
pages, so it scores against the same reference.

| | |
|---|---|
| Docling | 2.140.0 |
| EasyOCR | 1.7.2 (`lang=["fr"]`) |
| Python | 3.13.15 (Colab's own) |
| Pipeline | `do_ocr=True`, `do_table_structure=True` (cell matching) |
| Page breaks | `export_to_markdown(page_break_placeholder="<!-- pagebreak -->")` |

Docling is the lightest of the three: no VLM, layout + table models + EasyOCR.
It needs no API key and no model prompts.

## Result

**6/6 documents, 46 268 characters, 71.8 s.**

| Document | Pages | Chars | Seconds |
|---|---:|---:|---:|
| `110b25ca` (2026 inflation note) | 10 | 22 859 | 39.9 |
| `63b4ca02` (2022 inflation note) | 9 | 16 180 | 9.6 |
| `f31dfee9` (wide financial table) | 1 | 3 755 | 1.5 |
| `f2d799b9` (2018 circular, scan) | 4 | 1 623 | 10.9 |
| `6ab9508c` (2022 circular, scan) | 2 | 966 | 7.1 |
| `1a84a9a7` (2018 circular, scan) | 1 | 885 | 2.8 |

Faster than MinerU (72 s vs 138 s), but it carries no 90 s VLM engine start, so
the two numbers are not like-for-like.

## Engines on the same eighteen born-digital pages

Reproduce with `cd experiments && uv run python compare_ocr.py`. PaddleOCR-VL was
added later; the numbers below are the current four-way run.

| | LlamaParse | MinerU | Docling | PaddleOCR-VL |
|---|---:|---:|---:|---:|
| mean word F1 | 0.885 | **0.907** | 0.895 | 0.906 |
| pages at F1 ≥ 0.98 | 7 / 18 | 10 / 18 | **11 / 18** | 10 / 18 |
| pages at WER ≤ 0.10 | 8 / 18 | 8 / 18 | **9 / 18** | 8 / 18 |

On born-digital pages the four are close. Docling's weak spots are tables and
charts:

- **`f31dfee9`, the wide financial table: 1.000 F1, 0.000 WER** — as good as
  MinerU, better than LlamaParse (0.994 / 0.006) and PaddleOCR-VL (0.983 / 0.025).
- **`63b4ca02` p8 (table): 0.989 / 0.041** against MinerU's 1.000 / 0.009.
- **Charts are the worst of the four:** `63b4ca02` p7 is 0.353 for Docling,
  0.364 for MinerU, 0.483 for LlamaParse, 0.340 for PaddleOCR-VL.
- **The glossary** (`110b25ca` p9): 0.991 / 0.024, close to MinerU's 0.997 / 0.006.

## The scan is where it breaks down

`f2d799b9` (2018 circular, 840 kB, no text layer) exposes the difference. Page 1
belongs to a letterhead:

```
BANQUE DE LA RÉPUBLIQUE D'HAÏTI
CIRCULAIRE
No 95-1A
AUX MAISONS DE TRANSFERT
```

| Engine | Page 1 output |
|---|---|
| LlamaParse | `logo: Banque de la République d'Haiti … CIRCULAIRE No 95-1A AUX MAISONS DE TRANSFERT …` |
| MinerU (JSON) | `BRH / Banque de la République d'Haiti CIRCULAIRE No 95-1A / AUX MAISONS DE TRANSFERT` |
| Docling | `AUX MAISONS DE TRANSFERT blanchiment des declarntions de transection en espèces supérieur ou ég1l …` |

Docling drops the letterhead entirely and its body is visibly mis-read:
`déclarntions`, `transection`, `ég1l`, `circulairc`, `trnnsfert`, `ouvrbles`,
`frappéc`, `Gdes 5,000.9`. MinerU's reading of the same scan is clean prose.

That matters for this corpus specifically: the circular number is the citation
anchor, and 28% of the sample's pages have no text layer.

## Two things Docling does better

- **Page breaks.** `page_break_placeholder` gives per-page markdown out of the
  box. MinerU's markdown has no page markers at all; page boundaries only exist
  in its JSON.
- **Weight.** No VLM, no vLLM, no 3 GB of weights — it ran on Colab's stock
  Python 3.13 without a venv.

## Gotcha

Docling 2.x no longer pulls **EasyOCR** with the base install. Without it every
document fails at import time:

```
ImportError: EasyOCR is not installed. Please install it via `pip install easyocr`
```

## Files

| File | |
|---|---|
| `raw/<sha256>.md` | Docling markdown, `<!-- pagebreak -->` between pages |
| `raw/<sha256>.json` | `DoclingDocument.export_to_dict()` |
| `raw/results.json` | per-document status, chars, pages, seconds |

## Reproduce

```bash
pip install docling easyocr
python run.py            # writes raw/, on the T4 ~72 s for all six
cd .. && uv run python compare_ocr.py
```
