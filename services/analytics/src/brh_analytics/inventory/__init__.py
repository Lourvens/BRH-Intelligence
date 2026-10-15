"""Inventory analytics — what brh.ht publishes, from the crawl ledger.

Everything here describes the *catalogue*: every PDF the site exposes, with its
title, its date, its size and its download status. None of it needs a document
to have been parsed, which is why this family could be built before ingestion.
"""

from __future__ import annotations

from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_bytes
from brh_analytics.inventory import findings, ledger

SLUG = "inventory"
TITLE = "L'inventaire"
SUBTITLE = "Ce que brh.ht publie, document par document"

__all__ = ["SLUG", "SUBTITLE", "TITLE", "build", "findings", "ledger", "tables"]


def build() -> tuple[Finding, ...]:
    """Read the ledger and turn it into postable findings."""
    return findings.build(ledger.load())


def tables() -> dict[str, list[dict[str, object]]]:
    """The plain numbers behind the posts, for the dashboard."""
    inventory = ledger.load()
    largest = inventory.largest
    return {
        "Familles": [
            {"Famille": name, "Documents": count}
            for name, count in inventory.family_counts().items()
        ],
        "Années": [
            {"Année": year, "Documents": count} for year, count in inventory.count_by_year().items()
        ],
        "Tailles": [
            {"Mesure": "documents avec taille connue", "Valeur": len(inventory.sizes)},
            {"Mesure": "total connu", "Valeur": fr_bytes(inventory.known_size_total)},
            {"Mesure": "médiane", "Valeur": fr_bytes(inventory.median_size or 0)},
            {
                "Mesure": "plus gros document",
                "Valeur": f"{fr_bytes(largest.size)} — {largest.title[:60]}" if largest else "—",
            },
        ],
    }
