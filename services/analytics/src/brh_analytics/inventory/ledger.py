"""Read the crawl ledger — the operational record of what brh.ht publishes.

This reads ``corpus.crawl_urls``, the *inventory*, not the corpus. ADR-0006
(agent and MCP retrieve through ``RetrievalService``) therefore does not apply:
this is ops data, and the queries are shaped for reporting rather than
retrieval.

Everything is loaded in one query and classified in Python. At ~1 200 rows that
is free, and a taxonomy you can read beats one buried in SQL regular
expressions.
"""

from __future__ import annotations

import html
import re
from collections import Counter
from dataclasses import dataclass
from datetime import date

from brh_core.config import Settings, get_settings
from brh_core.db.pool import open_pool

_SQL = "SELECT title, wp_date, content_length FROM corpus.crawl_urls"

# A BRH circular is usually its number: "95-1A Déclaration…", "110 Sur les…",
# "61-2 Vérification…". Matched before the keyword rules, which would otherwise
# file them under whatever noun the title happens to contain.
_NUMBERED_CIRCULAR = re.compile(r"^\d{2,3}(-\d+[A-Za-z]?)?\s")

# A "?" jammed against a letter is damage from a bad charset conversion
# ("Mone?taire", "aou?t"), never French punctuation — French puts a space
# before the question mark.
_MOJIBAKE = re.compile(r"[a-zà-ÿ]\?")

# A recruitment notice is the one family worth naming separately: the post and
# the family table use it, and it catches job titles the family rule would
# otherwise leave in the unclassified bucket.
RECRUITMENT = (
    r"auditeur|inspecteur|analyste|comptable|directeur|assistant|technicien"
    r"|candidature|vacance|profil de poste|\bemploi\b|recrutement|\bposte\b"
)

# Ordered: the first match wins, so specific families precede generic ones.
_FAMILIES: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("Circulaire", re.compile(r"circulair|circ\b|\bcir\b")),
    ("Bulletin", re.compile(r"bulletin|\bbul\d")),
    ("Note", re.compile(r"\bnote")),
    ("Avis", re.compile(r"\bavis\b|\bappel d.offres\b")),
    ("Rapport", re.compile(r"\brapport")),
    (
        "Revue / recherche",
        re.compile(r"working paper|document de travail|revue|rddcf|enqu|e?camel|research"),
    ),
    (
        "Statistiques",
        re.compile(r"statistiqu|tableau|indicateur|graph|e?tats?\b|chrono|s[eé]rie|\bbase\b"),
    ),
    (
        "Discours",
        re.compile(
            r"discours|allocution|mot du gouverneur|intervention|conf[ée]rence|s[ée]minaire"
        ),
    ),
    ("Recrutement", re.compile(RECRUITMENT)),
    (
        "Marché / taux",
        re.compile(r"\bbons?\b|taux|march[ée]|soumission|change|dollar|\btma\b|r[eé]sultat|gourde"),
    ),
    (
        "Loi / réglementation",
        re.compile(r"\bloi\b|d[ée]cret|arr[êe]t[ée]|\bcode\b|norme|r[èe]glement|convention|accord"),
    ),
)
OTHER = "Autres / séries"


@dataclass(frozen=True, slots=True)
class Document:
    """One catalogued URL, as the ledger knows it before any download."""

    title: str
    published: date | None
    size: int | None
    has_html_entities: bool = False
    """The source title carried undecoded markup (``&#8217;`` for an apostrophe)."""

    has_lost_accents: bool = False
    """The source title lost its accents to a bad charset step (``Mone?taire``)."""

    @property
    def year(self) -> int | None:
        return self.published.year if self.published else None

    @property
    def family(self) -> str:
        return family_of(self.title)

    @property
    def needs_cleaning(self) -> bool:
        return self.has_html_entities or self.has_lost_accents


def family_of(title: str) -> str:
    """Classify a title into a document family.

    Deliberately a plain function over the title: it is easy to test, easy to
    argue with, and never touches the database.
    """
    if _NUMBERED_CIRCULAR.match(title):
        return "Circulaire"
    low = title.lower()
    for name, pattern in _FAMILIES:
        if pattern.search(low):
            return name
    return OTHER


@dataclass(frozen=True, slots=True)
class Inventory:
    """The ledger as a whole, plus the shapes a chart or a caption needs."""

    documents: tuple[Document, ...]

    def matching(self, pattern: str) -> tuple[Document, ...]:
        """Documents whose title matches ``pattern`` (case-insensitive)."""
        regex = re.compile(pattern, re.IGNORECASE)
        return tuple(doc for doc in self.documents if regex.search(doc.title))

    @property
    def total(self) -> int:
        return len(self.documents)

    @property
    def first_published(self) -> date | None:
        dates = [doc.published for doc in self.documents if doc.published]
        return min(dates) if dates else None

    @property
    def last_published(self) -> date | None:
        dates = [doc.published for doc in self.documents if doc.published]
        return max(dates) if dates else None

    @property
    def dated(self) -> tuple[Document, ...]:
        return tuple(doc for doc in self.documents if doc.published)

    def count_by_year(self, documents: tuple[Document, ...] | None = None) -> dict[int, int]:
        """Documents per publication year, ascending, gap-free."""
        docs = self.documents if documents is None else documents
        counted = Counter(doc.year for doc in docs if doc.year)
        if not counted:
            return {}
        return {year: counted.get(year, 0) for year in range(min(counted), max(counted) + 1)}

    def family_counts(self) -> dict[str, int]:
        """Counts per family, most common first."""
        counted = Counter(doc.family for doc in self.documents)
        return dict(counted.most_common())

    @property
    def sizes(self) -> tuple[int, ...]:
        return tuple(doc.size for doc in self.documents if doc.size is not None)

    @property
    def known_size_total(self) -> int:
        return sum(self.sizes)

    @property
    def median_size(self) -> int | None:
        values = sorted(self.sizes)
        if not values:
            return None
        middle = len(values) // 2
        if len(values) % 2:
            return values[middle]
        return (values[middle - 1] + values[middle]) // 2

    @property
    def largest(self) -> Document | None:
        sized = [doc for doc in self.documents if doc.size is not None]
        return max(sized, key=lambda doc: doc.size or 0) if sized else None

    @property
    def damaged(self) -> tuple[Document, ...]:
        """Documents whose title needs repairing before it is ever displayed."""
        return tuple(doc for doc in self.documents if doc.needs_cleaning)

    @property
    def encoded(self) -> tuple[Document, ...]:
        return tuple(doc for doc in self.documents if doc.has_html_entities)

    @property
    def misspelled(self) -> tuple[Document, ...]:
        return tuple(doc for doc in self.documents if doc.has_lost_accents)

    @property
    def duplicate_titles(self) -> int:
        """Titles used by more than one URL — the same file, several addresses."""
        return sum(
            1 for _, count in Counter(doc.title for doc in self.documents).items() if count > 1
        )


def _to_document(row: dict) -> Document:
    raw = row["title"] or ""
    published = row["wp_date"]
    return Document(
        title=" ".join(html.unescape(raw).split()),
        published=published.date() if published else None,
        size=row["content_length"],
        has_html_entities="&" in raw,
        has_lost_accents=bool(_MOJIBAKE.search(raw)),
    )


def load(settings: Settings | None = None) -> Inventory:
    """Read the whole ledger. One query, one round trip."""
    settings = settings or get_settings()
    pool = open_pool(settings)
    pool.open()
    try:
        with pool.connection() as conn:
            rows = conn.execute(_SQL).fetchall()
    finally:
        pool.close()
    return Inventory(tuple(_to_document(row) for row in rows))
