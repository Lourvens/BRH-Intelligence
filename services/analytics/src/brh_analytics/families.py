"""The analytics families, in menu order.

A family is a subpackage that owns a source, a body of copy and a ``build()``.
Adding one means adding a package and a line here — nothing else in the scope
changes, and each family's output stays in its own directory under ``out/``.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from brh_analytics import corpus, inventory
from brh_analytics.finding import Finding


@dataclass(frozen=True, slots=True)
class Family:
    """One kind of analytics: where it reads, what it is called, what it says."""

    slug: str
    title: str
    subtitle: str
    build: Callable[[], tuple[Finding, ...]]
    tables: Callable[[], dict[str, list[dict[str, object]]]] | None = None
    """Optional tabular views for the dashboard: tab name -> rows."""


FAMILIES: tuple[Family, ...] = (
    Family(
        slug=inventory.SLUG,
        title=inventory.TITLE,
        subtitle=inventory.SUBTITLE,
        build=inventory.build,
        tables=inventory.tables,
    ),
    Family(
        slug=corpus.SLUG,
        title=corpus.TITLE,
        subtitle=corpus.SUBTITLE,
        build=corpus.build,
        tables=corpus.tables,
    ),
)
