"""The shape of one postable idea — the same for every analytics family.

Keeping this out of the families is what lets a chart, a post and the dashboard
work for inventory numbers today and corpus numbers later without changing.
"""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from matplotlib.figure import Figure


@dataclass(frozen=True, slots=True)
class Finding:
    """One postable idea: the copy, the number, and how to draw it."""

    slug: str
    eyebrow: str
    headline: str
    figure: str
    figure_label: str
    caption: str
    chart: Callable[..., Figure]

    def draw(self, width: int, height: int) -> Figure:
        """Render this finding's chart at the size the post gave it."""
        return self.chart(width=width, height=height)
