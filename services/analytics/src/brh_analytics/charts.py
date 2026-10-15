"""Charts, drawn to the rules in ``DESIGN.md``.

Deliberately free of any domain type: these take numbers and labels, nothing
else. That is what lets the inventory family use them today and a corpus family
tomorrow without either one reaching into the other.

They are also **naked** — no title, no legend chrome, no source line. The post
around a chart owns the headline and the attribution, so the same chart drops
into a slide or a report without fighting baked-in text.

Charts render at ``SCALE`` times their final size and are downsampled by
:func:`to_image`, so labels stay crisp at 1080px without a hinting font.
"""

from __future__ import annotations

import io
from collections.abc import Mapping, Sequence

import matplotlib
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.figure import Figure
from PIL import Image

from brh_analytics import palette
from brh_analytics.formatting import fr_number

SCALE = 2

# Long labels ("Revue / recherche") need room, so horizontal bars reserve the
# left third of the canvas for their axis.
_LABEL_FRACTION = 0.32


def apply_theme() -> None:
    """Push the palette into matplotlib's defaults. Idempotent.

    Called by every chart rather than at import: mutating global state as a
    side effect of importing a module is the kind of surprise that costs an
    afternoon later.
    """
    matplotlib.rcParams.update(
        {
            "font.family": _font_families(),
            "figure.facecolor": palette.SURFACE,
            "axes.facecolor": palette.SURFACE,
            "savefig.facecolor": palette.SURFACE,
            "text.color": palette.INK,
            "axes.edgecolor": palette.BORDER,
            "axes.labelcolor": palette.INK_MUTED,
            "xtick.color": palette.INK_MUTED,
            "ytick.color": palette.INK_MUTED,
            "axes.grid": False,
        }
    )


def _font_families() -> list[str]:
    """Brand faces when installed, DejaVu always — and never a findfont warning."""
    from matplotlib import font_manager

    installed = {face.name for face in font_manager.fontManager.ttflist}
    return [name for name in ("Montserrat", "Inter") if name in installed] + ["DejaVu Sans"]


def _figure(width: int, height: int) -> Figure:
    """A bare figure whose pixel geometry is the caller's business."""
    apply_theme()
    figure = Figure(figsize=(width / 100, height / 100), dpi=100 * SCALE)
    figure.patch.set_facecolor(palette.SURFACE)
    FigureCanvasAgg(figure)
    return figure


def _strip(axes) -> None:
    """Remove every spine and tick mark: the labels carry the structure."""
    for spine in axes.spines.values():
        spine.set_visible(False)
    axes.tick_params(length=0)


def to_image(figure: Figure, width: int, height: int) -> Image.Image:
    """Rasterise a figure at its final size."""
    buffer = io.BytesIO()
    FigureCanvasAgg(figure).print_png(buffer)
    buffer.seek(0)
    with Image.open(buffer) as rendered:
        return rendered.convert("RGB").resize((width, height), Image.LANCZOS)


def per_year(
    counts: Mapping[int, int],
    *,
    width: int = 940,
    height: int = 420,
    highlight: int | None = None,
) -> Figure:
    """Vertical bars, one per year, each labelled directly.

    With every bar labelled the value axis is redundant, so there is none — the
    annotation *is* the scale.
    """
    years = list(counts)
    values = [counts[year] for year in years]
    ceiling = max(values, default=1)

    figure = _figure(width, height)
    axes = figure.add_axes((0.015, 0.11, 0.975, 0.80))
    axes.bar(
        [str(year) for year in years],
        values,
        width=0.6,
        color=[palette.GOLD if year == highlight else palette.NAVY for year in years],
    )
    for index, value in enumerate(values):
        axes.text(
            index,
            value + ceiling * 0.02,
            fr_number(value),
            ha="center",
            va="bottom",
            fontsize=11,
            fontweight="bold",
            color=palette.INK,
        )
    axes.set_ylim(0, ceiling * 1.16)
    axes.set_yticks([])
    axes.tick_params(axis="x", labelsize=12)
    _strip(axes)
    return figure


def horizontal_bars(
    items: Sequence[tuple[str, int, str]],
    *,
    width: int = 940,
    height: int = 420,
) -> Figure:
    """Ranked horizontal bars — ``(label, value, colour)``, already ordered."""
    labels = [item[0] for item in items]
    values = [item[1] for item in items]
    colours = [item[2] for item in items]
    ceiling = max(values, default=1)
    positions = list(range(len(items)))

    figure = _figure(width, height)
    axes = figure.add_axes((_LABEL_FRACTION, 0.02, 1 - _LABEL_FRACTION - 0.02, 0.96))
    axes.barh(positions, values, height=0.6, color=colours)
    for position, value in zip(positions, values, strict=True):
        axes.text(
            value + ceiling * 0.015,
            position,
            fr_number(value),
            va="center",
            ha="left",
            fontsize=11,
            fontweight="bold",
            color=palette.INK,
        )
    axes.set_yticks(positions)
    axes.set_yticklabels(labels, fontsize=12)
    axes.invert_yaxis()
    # A bar takes 60% of its slot, so with only two or three categories the bars
    # would be slabs. Padding the axis to a minimum of five slots keeps the
    # weight consistent between a two-bar post and an eight-bar one.
    padding = max(0, (5 - len(items)) / 2)
    axes.set_ylim(len(items) - 0.5 + padding, -0.5 - padding)
    axes.set_xticks([])
    axes.set_xlim(0, ceiling * 1.14)
    _strip(axes)
    return figure
