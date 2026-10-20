"""The corpus copy: what the extracted documents say, in French, ready to post.

Same contract as the inventory family — one idea per asset, the headline makes a
claim, the figure proves it, the caption says where the number came from — and
every number is read from ``meta.json`` or ``page-profiles.json``. Nothing is
typed in that could drift.

Two registers, never mixed: findings about the **extracted corpus** (all 182
documents) and findings about the **per-page sample** (116 documents, 1 192
pages). A sample finding says so in its caption, because a share measured on a
sixth of the catalogue is not a share of the catalogue.
"""

from __future__ import annotations

from collections import Counter
from functools import partial

from brh_analytics import charts, palette
from brh_analytics.corpus.source import Corpus, YearPages, bucket, quantile
from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_duration, fr_number, fr_percent

# Category charts: every bar visible at once, so no two may share a hue. The
# three scanned-page and page-element charts each need distinct colours rather
# than one colour and a neutral.
_DIGITAL = palette.NAVY
_HYBRID = palette.AZURE
_SCANNED = palette.GOLD_INK
_DONE = palette.NAVY
_LEFT = palette.SLATE


def build(corpus: Corpus) -> tuple[Finding, ...]:
    """Every finding, most general first. Coverage needs the catalogue."""
    if not corpus.extractions:
        # Nothing was measured, so there is nothing honest to post.
        return ()
    findings: list[Finding] = []
    if corpus.catalogue:
        findings += [_coverage(corpus), _remaining(corpus)]
    findings.append(_volume(corpus))
    findings.append(_pace(corpus))
    findings.append(_tail(corpus))
    findings += _sample_findings(corpus)
    return tuple(findings)


def _coverage(corpus: Corpus) -> Finding:
    catalogue = corpus.catalogue
    assert catalogue is not None  # the caller only builds this with one
    coverage = corpus.coverage or 0.0
    known = catalogue.total - catalogue.pending_total
    unseen = max(0, corpus.documents - known)
    return Finding(
        slug="couverture",
        eyebrow="L'extraction",
        headline=(
            f"{fr_number(corpus.documents)} documents extraits sur {fr_number(catalogue.total)}"
        ),
        figure=fr_percent(coverage),
        figure_label="du catalogue passé à l'OCR",
        caption=(
            f"{fr_number(corpus.pages)} pages et "
            f"{fr_number(corpus.chars / 1_000_000, decimals=1)} millions de caractères "
            "extraits et vérifiés. Le catalogue ne suit que les téléchargements de "
            f"l'inventaire : {fr_number(unseen)} de ces documents ont été récupérés par "
            "les lots OCR, hors de son périmètre."
        ),
        chart=partial(
            charts.horizontal_bars,
            [
                ("Extraits", corpus.documents, _DONE),
                ("À extraire", corpus.remaining or 0, _LEFT),
            ],
        ),
    )


def _remaining(corpus: Corpus) -> Finding:
    catalogue = corpus.catalogue
    assert catalogue is not None
    pending = catalogue.pending
    worst_year = max(pending, key=lambda year: pending[year])
    share = 100 * pending[worst_year] / catalogue.pending_total if catalogue.pending_total else 0
    last_year = max(catalogue.years)
    return Finding(
        slug="reste",
        eyebrow="Ce qui reste",
        headline=f"{fr_number(catalogue.pending_total)} documents attendent encore leur tour",
        figure=fr_number(pending[worst_year]),
        figure_label=f"documents de {worst_year} non téléchargés",
        caption=(
            f"{fr_percent(share, decimals=0)} du reliquat vient de {worst_year}. Le fonds "
            "ancien domine : les années récentes sont presque aussi incomplètes en "
            f"proportion, mais elles pèsent moins ({fr_number(pending[last_year])} documents "
            f"en {last_year})."
        ),
        chart=partial(charts.per_year, pending, highlight=worst_year),
    )


def _page_bins(corpus: Corpus) -> tuple[tuple[str, int], ...]:
    bounds = ((1, 2), (2, 3), (3, 5), (5, 10), (10, 20), (20, 40), (40, 68))
    labels = ("1", "2", "3-4", "5-9", "10-19", "20-39", "40-67")
    return tuple(zip(labels, bucket(corpus.page_counts, bounds), strict=True))


def _volume(corpus: Corpus) -> Finding:
    counts = Counter(corpus.page_counts)
    largest = max(counts)
    documents = counts[largest]
    share = 100 * documents * largest / corpus.pages if corpus.pages else 0
    single = counts[1]
    one_page = f" : {fr_number(single)} documents tiennent sur une seule." if single else "."
    return Finding(
        slug="volume",
        eyebrow="Le corpus extrait",
        headline=(
            f"{fr_number(documents)} documents de {fr_number(largest)} pages, "
            f"{fr_percent(share, decimals=0)} des pages"
        ),
        figure=fr_percent(share),
        figure_label=f"des {fr_number(corpus.pages)} pages extraites",
        caption=(
            f"{fr_number(corpus.documents)} documents, {fr_number(corpus.pages)} pages, "
            f"{fr_number(corpus.chars / 1_000_000, decimals=1)} millions de caractères et "
            f"{fr_number(corpus.figures)} figures. La médiane est de "
            f"{fr_number(round(corpus.median_pages))} pages{one_page}"
        ),
        chart=partial(charts.histogram, _page_bins(corpus)),
    )


def _pace(corpus: Corpus) -> Finding:
    bounds = ((0, 5), (5, 10), (10, 20), (20, 40), (40, 80), (80, 10_000))
    labels = ("0-5", "5-10", "10-20", "20-40", "40-80", "80 +")
    values = [item.seconds_per_page for item in corpus.extractions]
    bins = tuple(zip(labels, bucket(values, bounds), strict=True))
    worst = max(values, default=0.0)
    return Finding(
        slug="rythme",
        eyebrow="Le coût",
        headline=(
            f"{fr_number(corpus.seconds_per_page, decimals=1)} secondes par page, "
            f"{fr_number(worst, decimals=1)} au pire"
        ),
        figure=f"{fr_number(corpus.seconds_per_page, decimals=1)} s",
        figure_label=f"par page — {fr_duration(corpus.seconds)} de calcul au total",
        caption=(
            f"Médiane {fr_number(corpus.median_seconds_per_page, decimals=1)} s, "
            f"neuvième décile {fr_number(quantile(values, 0.9), decimals=1)} s. Le temps "
            "suit la densité de la page (les caractères), pas la longueur du document : "
            "une circulaire d'une page reste bon marché."
        ),
        chart=partial(charts.histogram, bins),
    )


def _tail(corpus: Corpus) -> Finding:
    bounds = ((0, 1), (1, 5), (5, 10), (10, 20), (20, 10_000))
    labels = ("0-1", "1-5", "5-10", "10-20", "20 +")
    minutes = [item.seconds / 60 for item in corpus.extractions]
    bins = tuple(zip(labels, bucket(minutes, bounds), strict=True))
    slowest = corpus.slowest
    assert slowest is not None  # an empty corpus draws no posts
    over_twenty = corpus.slower_than(20)
    over_ten = corpus.slower_than(10)
    return Finding(
        slug="queue",
        eyebrow="La queue",
        headline=f"{fr_number(over_twenty)} documents dépassent vingt minutes d'OCR",
        figure=fr_duration(slowest.seconds),
        figure_label=f"pour le plus coûteux ({fr_number(slowest.pages)} pages)",
        caption=(
            f"{fr_number(over_ten)} documents dépassent dix minutes, alors que la moitié "
            f"est expédiée en moins de {fr_duration(corpus.median_seconds)}. La facture "
            "n'est pas dans la moyenne : elle est dans la queue."
        ),
        chart=partial(charts.histogram, bins),
    )


def _sample_findings(corpus: Corpus) -> list[Finding]:
    """The per-page posts. Absent when the profile file is absent."""
    if not corpus.sample.pages:
        return []
    return [_pages(corpus), _hybrid(corpus), _elements(corpus)]


def _scan_phrase(yearly: dict[int, YearPages], ranked: list[int]) -> str:
    """Where the scanned pages sit, in the sample's own years."""
    if not ranked:
        return "Aucune page scannée dans l'échantillon."
    leaders = [f"{year} ({fr_percent(yearly[year].scanned_share)})" for year in ranked[:2]]
    none = [str(year) for year in yearly if not yearly[year].scanned]
    phrase = "Les scans se concentrent en " + " et ".join(leaders)
    return phrase + (f" ; {', '.join(none)} n'en compte aucun." if none else ".")


def _pages(corpus: Corpus) -> Finding:
    sample = corpus.sample
    yearly = sample.by_year()
    ranked = sorted(
        (year for year in yearly if yearly[year].scanned),
        key=lambda year: yearly[year].scanned_share,
        reverse=True,
    )
    return Finding(
        slug="pages",
        eyebrow="L'échantillon · pages",
        headline=f"{fr_number(sample.scanned)} pages n'ont aucune couche texte",
        figure=fr_percent(sample.scanned_share),
        figure_label=f"des {fr_number(sample.total)} pages profilées",
        caption=(
            f"Sur les {fr_number(sample.total)} pages profilées de "
            f"{fr_number(sample.documents)} documents : {fr_number(sample.born_digital)} "
            f"sont nativement numériques et ne demandent aucun GPU. "
            f"{_scan_phrase(yearly, ranked)}"
        ),
        chart=partial(
            charts.per_year,
            {year: row.scanned_share for year, row in yearly.items()},
            formatter=fr_percent,
        ),
    )


def _hybrid(corpus: Corpus) -> Finding:
    sample = corpus.sample
    kinds = sample.document_kinds
    hidden = sample.hybrid_scanned_pages
    whole = sample.wholly_scanned_pages
    # The digital majority is deliberately absent: charting it would make the
    # hidden scanned pages — the whole point — the smallest bar on the card.
    ranked = [
        ("Documents scannés", whole, _SCANNED),
        ("Documents mixtes", hidden, _HYBRID),
    ]
    return Finding(
        slug="hybride",
        eyebrow="L'échantillon · documents",
        headline=(
            f"{fr_number(kinds['hybrid'])} documents cachent {fr_number(hidden)} pages scannées"
        ),
        figure=fr_number(hidden),
        figure_label="pages scannées dans des documents mixtes",
        caption=(
            f"Sur les {fr_number(sample.scanned)} pages à océriser, {fr_number(whole)} sont "
            f"dans {fr_number(kinds['scanned'])} documents entièrement scannés et "
            f"{fr_number(hidden)} dans {fr_number(kinds['hybrid'])} documents mixtes. Un "
            "verdict par document ignorerait ces dernières : le routeur doit décider page "
            "par page."
        ),
        chart=partial(charts.horizontal_bars, ranked),
    )


def _elements(corpus: Corpus) -> Finding:
    sample = corpus.sample
    scanned_tables = sum(1 for page in sample.pages if page.table and page.scanned)
    share = 100 * sample.tables / sample.total if sample.total else 0
    if scanned_tables:
        headline = (
            f"{fr_number(sample.tables)} pages de tableaux, "
            f"dont {fr_number(scanned_tables)} scannées"
        )
        caution = (
            f"{fr_number(scanned_tables)} pages avec un tableau sont scannées : "
            "leur lecture dépend de l'OCR."
        )
    else:
        headline = f"{fr_number(sample.tables)} pages de tableaux, aucune scannée"
        caution = (
            "Les tableaux sont tous sur des pages nativement numériques : c'est le "
            "texte qu'on lit sans OCR."
        )
    ranked = [
        ("Tableaux", sample.tables, _DIGITAL),
        ("Colonnes", sample.columns, _HYBRID),
        ("Figures", sample.figures, _SCANNED),
    ]
    return Finding(
        slug="tableaux",
        eyebrow="L'échantillon · contenu",
        headline=headline,
        figure=fr_number(sample.tables),
        figure_label=f"pages sur {fr_number(sample.total)} profilées",
        caption=(
            f"Sur les {fr_number(sample.total)} pages profilées : "
            f"{fr_percent(share)} portent un tableau, {fr_number(sample.figures)} une "
            f"figure et {fr_number(sample.columns)} sont en colonnes. {caution}"
        ),
        chart=partial(charts.horizontal_bars, ranked),
    )
