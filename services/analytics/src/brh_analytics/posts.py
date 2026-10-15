"""Compose a post: the copy, the chart and the attribution on one canvas.

Canvas sizes come from ``DESIGN.md``. The layout is written in *design space* —
the same 1080-wide grid for every format — and divided down by ``scale`` at the
end. That is what lets one template serve a square post, a story and a wide
link-preview card without a second set of numbers.
"""

from __future__ import annotations

from datetime import date
from pathlib import Path

from PIL import Image, ImageDraw

from brh_analytics import assets, charts, palette
from brh_analytics.finding import Finding
from brh_analytics.formatting import fr_date_short

#: From ``DESIGN.md``.
POST_SIZES: dict[str, tuple[int, int]] = {
    "square": (1080, 1080),
    "portrait": (1080, 1350),
    "story": (1080, 1920),
    "landscape": (1200, 630),
    "slide": (1920, 1080),
}

SUPERSAMPLE = 2
SOURCE = "Banque de la République d'Haïti · brh.ht"

# Design-space metrics: 1080-wide grid, whatever the real canvas is.
DESIGN_WIDTH = 1080
_MARGIN = 72
_TOP_RULE = 8
_FOOTER = 90
_PANEL_PADDING = 22
_PANEL_RADIUS = 18
_GAP_AFTER_HEADLINE = 26
_GAP_BEFORE_FIGURE = 40
_FIGURE_BLOCK = 130  # the big number plus its label
_MIN_PANEL = 190  # below this the chart is not worth showing


def render(finding: Finding, *, size: str = "square", on: date | None = None) -> Image.Image:
    """Draw one finding as a finished image."""
    width, height = POST_SIZES[size]
    scale = min(width, height) / DESIGN_WIDTH
    canvas = Image.new("RGB", (width * SUPERSAMPLE, height * SUPERSAMPLE), palette.BG)
    draw = ImageDraw.Draw(canvas)

    # Design space: the canvas described on the 1080 grid.
    design_w = width / scale
    design_h = height / scale

    def px(value: float) -> int:
        return round(value * scale * SUPERSAMPLE)

    def font(pt: float, *, bold: bool = False):
        return assets.font(round(pt * scale), bold=bold, scale=SUPERSAMPLE)

    def put(x: float, y: float, text: str, face, colour: str) -> None:
        draw.text((px(x), px(y)), text, font=face, fill=colour)

    draw.rectangle([0, 0, canvas.width, px(_TOP_RULE)], fill=palette.NAVY)

    column = design_w - 2 * _MARGIN
    cursor = _MARGIN + 12
    put(_MARGIN, cursor, finding.eyebrow.upper(), font(20, bold=True), palette.GOLD_INK)
    cursor += 38

    headline = font(46, bold=True)
    for line in _wrap(draw, finding.headline, headline, px(column)):
        put(_MARGIN, cursor, line, headline, palette.NAVY)
        cursor += 58
    cursor += _GAP_AFTER_HEADLINE

    caption = font(20)
    caption_lines = _wrap(draw, finding.caption, caption, px(column))

    # Measure the copy that sits under the chart, then give the chart whatever
    # room is left. If that is not enough, drop the chart rather than leave a
    # hole where it should have been.
    block = _FIGURE_BLOCK + len(caption_lines) * 28
    panel_h = design_h - _FOOTER - 44 - block - cursor
    panel_w = column

    if panel_h >= _MIN_PANEL:
        _draw_panel(canvas, draw, px, finding, _MARGIN, cursor, panel_w, panel_h)
        cursor += panel_h + _GAP_BEFORE_FIGURE
    else:
        cursor += 24

    put(_MARGIN, cursor, finding.figure, font(84, bold=True), palette.NAVY)
    cursor += 100
    put(_MARGIN, cursor, finding.figure_label, font(22), palette.INK_MUTED)
    cursor += 34
    for line in caption_lines:
        put(_MARGIN, cursor, line, caption, palette.INK_MUTED)
        cursor += 28

    _draw_footer(draw, canvas, px, font, on or date.today())
    return canvas.resize((width, height), Image.LANCZOS)


def _draw_panel(canvas, draw, px, finding, left, top, panel_w, panel_h) -> None:
    """The white chart panel: a rounded card with the chart inset inside it."""
    panel = Image.new("RGB", (px(panel_w), px(panel_h)), palette.SURFACE)
    inner_w = panel.width - 2 * px(_PANEL_PADDING)
    inner_h = panel.height - 2 * px(_PANEL_PADDING)

    # The figure is designed for the size it will actually be displayed at,
    # then rasterised at the supersampled resolution the canvas works in.
    figure = finding.draw(inner_w // SUPERSAMPLE, inner_h // SUPERSAMPLE)
    panel.paste(charts.to_image(figure, inner_w, inner_h), (px(_PANEL_PADDING), px(_PANEL_PADDING)))

    mask = Image.new("L", panel.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, panel.width - 1, panel.height - 1], radius=px(_PANEL_RADIUS), fill=255
    )
    canvas.paste(panel, (px(left), px(top)), mask)
    draw.rounded_rectangle(
        [px(left), px(top), px(left + panel_w) - 1, px(top + panel_h) - 1],
        radius=px(_PANEL_RADIUS),
        outline=palette.BORDER,
        width=max(px(1), 1),
    )


def _draw_footer(draw, canvas: Image.Image, px, font, on: date) -> None:
    top = canvas.height - px(_FOOTER)
    draw.rectangle([0, top, canvas.width, canvas.height], fill=palette.NAVY)
    face = font(19)
    baseline = top + px(_FOOTER / 2 - 13)
    draw.text((px(_MARGIN), baseline), SOURCE, font=face, fill=palette.SURFACE)
    stamp = fr_date_short(on)
    draw.text(
        (canvas.width - px(_MARGIN) - draw.textlength(stamp, font=face), baseline),
        stamp,
        font=face,
        fill=palette.SURFACE,
    )


def _wrap(draw: ImageDraw.ImageDraw, text: str, face, max_width: int) -> list[str]:
    """Greedy word wrap, measured with the real font."""
    lines: list[str] = []
    current = ""
    for word in text.split():
        candidate = f"{current} {word}".strip()
        if not current or draw.textlength(candidate, font=face) <= max_width:
            current = candidate
        else:
            lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_family(family, *, sizes: tuple[str, ...] = ("square",), directory: Path) -> list[Path]:
    """Write one family's findings under ``directory/<family slug>/``."""
    target = directory / family.slug
    target.mkdir(parents=True, exist_ok=True)
    written: list[Path] = []
    for finding in family.build():
        for size in sizes:
            path = target / f"{finding.slug}-{size}.png"
            render(finding, size=size).save(path)
            written.append(path)
    return written


def render_all(*, sizes: tuple[str, ...] = ("square",), directory: Path) -> list[Path]:
    """Write every family's findings, each under its own directory.

    Output is grouped the way the code is: ``out/inventory/…``, and later
    ``out/corpus/…``, so nothing has to be untangled by filename.
    """
    from brh_analytics.families import FAMILIES

    written: list[Path] = []
    for family in FAMILIES:
        written.extend(render_family(family, sizes=sizes, directory=directory))
    return written
