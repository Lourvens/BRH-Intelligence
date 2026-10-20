"""Corpus analytics — what OCR extracted, page by page and document by document.

This is the second family: the inventory counts what brh.ht *lists*, this one
counts what the pipeline has actually *read*. Volume, shape, cost and page
composition come from the committed extraction artefacts under ``data/ocr/``;
coverage comes from the crawl ledger. It never touches the retrieval store.
"""

from __future__ import annotations

from brh_analytics.corpus import findings, source
from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_duration, fr_number, fr_percent

SLUG = "corpus"
TITLE = "Le corpus extrait"
SUBTITLE = "Ce que l'OCR a lu, page par page"

__all__ = ["SLUG", "SUBTITLE", "TITLE", "build", "findings", "source", "tables"]


def build() -> tuple[Finding, ...]:
    """Read the extraction records and turn them into postable findings."""
    return findings.build(source.load())


def tables() -> dict[str, list[dict[str, object]]]:
    """The plain numbers behind the posts, for the dashboard."""
    corpus = source.load()
    views: dict[str, list[dict[str, object]]] = {}

    if corpus.catalogue:
        views["Couverture"] = [
            {
                "Année": year,
                "Catalogue": corpus.catalogue.years[year],
                "Non téléchargés": corpus.catalogue.pending[year],
            }
            for year in corpus.catalogue.years
        ]

    views["Volume"] = [
        {"Mesure": "documents extraits", "Valeur": fr_number(corpus.documents)},
        {"Mesure": "pages", "Valeur": fr_number(corpus.pages)},
        {"Mesure": "caractères", "Valeur": fr_number(corpus.chars)},
        {"Mesure": "figures", "Valeur": fr_number(corpus.figures)},
        {"Mesure": "temps de calcul", "Valeur": fr_duration(corpus.seconds)},
        {"Mesure": "médiane pages/document", "Valeur": fr_number(round(corpus.median_pages))},
        {
            "Mesure": "secondes par page",
            "Valeur": fr_number(corpus.seconds_per_page, decimals=1),
        },
    ]

    views["Machines"] = [
        {
            "Machine": name,
            "Documents": documents,
            "Pages": pages,
            "Médiane s/page": fr_number(per_page, decimals=1),
        }
        for name, (documents, pages, per_page) in corpus.gpu_mix().items()
    ]

    if corpus.sample.pages:
        views["Pages profilées"] = [
            {
                "Année": year,
                "Pages": row.pages,
                "Scannées": row.scanned,
                "Part scannée": fr_percent(row.scanned_share),
            }
            for year, row in corpus.sample.by_year().items()
        ]
        kinds = corpus.sample.document_kinds
        views["Documents profilés"] = [
            {"Type": "nativement numériques", "Documents": kinds["digital"]},
            {"Type": "mixtes", "Documents": kinds["hybrid"]},
            {"Type": "entièrement scannés", "Documents": kinds["scanned"]},
        ]

    views["Documents lents"] = [
        {
            "Document": item.sha256[:8],
            "Pages": item.pages,
            "Durée": fr_duration(item.seconds),
            "Secondes/page": fr_number(item.seconds_per_page, decimals=1),
            "Machine": item.gpu or "inconnue",
        }
        for item in sorted(corpus.extractions, key=lambda item: item.seconds, reverse=True)[:10]
    ]
    return views
