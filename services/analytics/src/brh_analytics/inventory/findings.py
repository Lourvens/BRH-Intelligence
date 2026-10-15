"""The inventory copy: what the catalogue's numbers mean, in French, ready to post.

A finding is copy plus the chart that illustrates it. No layout, no rendering —
so the words can be reviewed on their own, which is the point: the writing is
the part worth arguing about, and every figure is derived from the ledger so it
cannot drift from the data.

Copy rules kept here: one idea per asset, the headline makes a claim, the figure
proves it, the caption says where the number comes from. No exclamation marks,
no "données fascinantes".
"""

from __future__ import annotations

from functools import partial

from brh_analytics import charts, palette
from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_bytes, fr_date, fr_number
from brh_analytics.inventory import ledger
from brh_analytics.inventory.ledger import Inventory

#: Families ranked once, so a reader who sees two posts sees the same colour
#: mean the same thing.
_CATEGORY_ORDER: tuple[str, ...] = (
    "Note",
    "Circulaire",
    "Bulletin",
    "Statistiques",
    "Rapport",
    "Avis",
    "Revue / recherche",
    "Marché / taux",
    "Recrutement",
    "Discours",
    "Loi / réglementation",
    ledger.OTHER,
)


def colour_for(category: str) -> str:
    """The one colour a category is allowed to be.

    No two categories in a chart may share a hue, which is why this indexes an
    eight-colour ramp rather than the six-colour series rotation.
    """
    override = {"Accents perdus": palette.SCARLET, "Entités HTML": palette.GOLD_INK}
    if category in override:
        return override[category]
    index = _CATEGORY_ORDER.index(category) if category in _CATEGORY_ORDER else 0
    return palette.CATEGORY[index % len(palette.CATEGORY)]


def build(inventory: Inventory) -> tuple[Finding, ...]:
    """Every finding, most general first."""
    return (
        _archive(inventory),
        _migration(inventory),
        _families(inventory),
        _inflation(inventory),
        _recruitment(inventory),
        _quality(inventory),
    )


def _spike(inventory: Inventory) -> int:
    """Documents published on 9-10 August 2018 — the site migration."""
    landing = {(2018, 8, 9), (2018, 8, 10)}
    return sum(
        1
        for doc in inventory.documents
        if doc.published and (doc.published.year, doc.published.month, doc.published.day) in landing
    )


def _archive(inventory: Inventory) -> Finding:
    return Finding(
        slug="archive",
        eyebrow="L'archive",
        headline=f"{fr_number(inventory.total)} documents de la BRH, réunis au même endroit",
        figure=fr_number(inventory.total),
        figure_label="documents catalogués",
        caption=(
            f"Du {fr_date(inventory.first_published)} au {fr_date(inventory.last_published)}. "
            "Circulaires, notes, bulletins, rapports et séries statistiques — "
            f"{fr_bytes(inventory.known_size_total)} connus, suivis automatiquement."
        ),
        chart=partial(charts.per_year, inventory.count_by_year()),
    )


def _migration(inventory: Inventory) -> Finding:
    spike = _spike(inventory)
    return Finding(
        slug="migration",
        eyebrow="Faux signal",
        headline=f"{fr_number(spike)} documents publiés en deux jours",
        figure=fr_number(spike),
        figure_label="les 9 et 10 août 2018",
        caption=(
            "Ce pic n'est pas un effort de publication : c'est le déménagement de "
            "l'archive vers le site actuel. Avant de compter, il faut savoir ce qu'on "
            "compte."
        ),
        chart=partial(charts.per_year, inventory.count_by_year(), highlight=2018),
    )


def _families(inventory: Inventory) -> Finding:
    counts = inventory.family_counts()
    unclassified = counts.get(ledger.OTHER, 0)
    # "Autres / séries" is a bucket, not a family: at the top of the chart it
    # would both dominate and contradict the headline. It belongs in the caption.
    named = [(name, count) for name, count in counts.items() if name != ledger.OTHER][:8]
    ranked = [(name, count, colour_for(name)) for name, count in named]
    return Finding(
        slug="familles",
        eyebrow="De quoi parle la BRH",
        headline="La note est le document le plus courant",
        figure=fr_number(counts.get("Note", 0)),
        figure_label=f"notes, sur {fr_number(inventory.total)} documents",
        caption=(
            "Notes d'inflation, de politique monétaire, d'information. Puis les "
            f"circulaires ({fr_number(counts.get('Circulaire', 0))}) et les bulletins "
            f"trimestriels ({fr_number(counts.get('Bulletin', 0))}). "
            f"{fr_number(unclassified)} titres restent à classer."
        ),
        chart=partial(charts.horizontal_bars, ranked),
    )


def _inflation(inventory: Inventory) -> Finding:
    notes = inventory.matching("inflation")
    by_year = inventory.count_by_year(notes)
    latest = max(by_year) if by_year else None
    return Finding(
        slug="inflation",
        eyebrow="Le rendez-vous",
        headline="La note d'inflation ne saute plus un mois",
        figure=fr_number(by_year.get(latest, 0)) if latest else "0",
        figure_label=f"notes d'inflation en {latest}" if latest else "notes d'inflation",
        caption=(
            f"{fr_number(len(notes))} notes au total depuis 2019. La série ne devient "
            "mensuelle qu'en 2022 : deux en 2019, cinq en 2021, treize en 2025."
        ),
        chart=partial(charts.per_year, by_year),
    )


def _recruitment(inventory: Inventory) -> Finding:
    posts = inventory.matching(ledger.RECRUITMENT)
    wave = sum(1 for doc in posts if doc.year in {2023, 2024})
    return Finding(
        slug="recrutement",
        eyebrow="Insolite",
        headline="La BRH recrute dans sa médiathèque",
        figure=fr_number(len(posts)),
        figure_label="offres d'emploi et profils de poste",
        caption=(
            f"Auditeurs, inspecteurs, analystes : {fr_number(wave)} de ces annonces sont "
            "parues en 2023 et 2024. Elles sont rangées avec les circulaires, au même "
            "format et à la même adresse."
        ),
        chart=partial(charts.per_year, inventory.count_by_year(posts)),
    )


def _quality(inventory: Inventory) -> Finding:
    damaged = inventory.damaged
    # "Intacts" is 971 of 1 169: charting it would make the real finding — 198
    # damaged titles — the smallest bar on the card. The chart shows the two
    # defects; the total is the headline.
    ranked = [
        ("Entités HTML", len(inventory.encoded), colour_for("Entités HTML")),
        ("Accents perdus", len(inventory.misspelled), colour_for("Accents perdus")),
    ]
    return Finding(
        slug="qualite",
        eyebrow="Coulisses",
        headline=f"{fr_number(len(damaged))} titres sont arrivés abîmés",
        figure=fr_number(len(damaged)),
        figure_label=f"titres sur {fr_number(inventory.total)}",
        caption=(
            f"{fr_number(len(inventory.encoded))} portent des entités HTML non décodées et "
            f"{fr_number(len(inventory.misspelled))} des accents perdus (« Mone?taire », "
            "« aou?t ») ; certains cumulent les deux. On répare à l'ingestion, la source "
            "reste intacte."
        ),
        chart=partial(charts.horizontal_bars, ranked),
    )
