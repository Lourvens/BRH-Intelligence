"""Render the token sheet to ``assets/palette.png``.

Pillow only — no charting library — so the palette can be regenerated before
the plotting stack is chosen::

    uv run python -m brh_analytics

Montserrat is preferred when it has been dropped into ``assets/fonts/``;
DejaVu is the fallback so the render works offline.
"""

from pathlib import Path

from PIL import Image, ImageDraw

from brh_analytics import assets, palette

ASSETS_DIR = assets.ASSETS_DIR
OUTPUT_PATH = ASSETS_DIR / "palette.png"

_SCALE = 2  # draw oversized and downsample, so hairlines and text stay crisp
_WIDTH = 1680
_MARGIN = 72
_SWATCH_W = 180
_SWATCH_H = 110
_GAP = 12
_GROUP_LABEL_H = 40
_LABEL_H = 58
_GROUP_GAP = 44
_TITLE_BLOCK_H = 150
_FOOTER_H = 44

# Brand colours that are fills by design: no contrast threshold applies, so the
# sheet says so instead of printing a near-1:1 ratio.
_FILL_ONLY: tuple[str, ...] = (palette.GOLD,)

_GROUPS: tuple[tuple[str, tuple[tuple[str, str], ...]], ...] = (
    (
        "Brand",
        (
            ("navy", palette.NAVY),
            ("navy-deep", palette.NAVY_DEEP),
            ("navy-700", palette.NAVY_700),
            ("blue", palette.BLUE),
            ("teal", palette.TEAL),
            ("azure", palette.AZURE),
            ("gold", palette.GOLD),
            ("purple", palette.PURPLE),
        ),
    ),
    (
        "Neutrals",
        (
            ("bg", palette.BG),
            ("surface", palette.SURFACE),
            ("surface-alt", palette.SURFACE_ALT),
            ("border", palette.BORDER),
            ("ink", palette.INK),
            ("ink-muted", palette.INK_MUTED),
        ),
    ),
    (
        "Chart series",
        tuple((f"S{index + 1}", colour) for index, colour in enumerate(palette.SERIES)),
    ),
    (
        "Semantic",
        (
            ("positive", palette.SEMANTIC["positive"]),
            ("negative", palette.SEMANTIC["negative"]),
        ),
    ),
)


def _font(size: int, *, bold: bool = False):
    """Montserrat if bundled, DejaVu otherwise — the repo renders offline."""
    return assets.font(size, bold=bold, scale=_SCALE)


def _height() -> int:
    rows = sum(_GROUP_LABEL_H + _SWATCH_H + _LABEL_H + _GROUP_GAP for _ in _GROUPS)
    return _MARGIN + _TITLE_BLOCK_H + rows - _GROUP_GAP + _FOOTER_H + _MARGIN


def render() -> Path:
    """Draw the sheet and write it to :data:`OUTPUT_PATH`."""
    image = Image.new("RGB", (_WIDTH * _SCALE, _height() * _SCALE), palette.SURFACE)
    draw = ImageDraw.Draw(image)

    def at(value: int) -> int:
        return value * _SCALE

    def text(x: int, y: int, value: str, size: int, colour: str, *, bold: bool = False) -> None:
        draw.text((at(x), at(y)), value, font=_font(size, bold=bold), fill=colour)

    text(_MARGIN, _MARGIN, "BRH Intelligence", 30, palette.NAVY, bold=True)
    text(
        _MARGIN,
        _MARGIN + 42,
        "Palette — sampled from brh.ht, held to WCAG AA",
        17,
        palette.INK_MUTED,
    )
    text(
        _MARGIN,
        _MARGIN + 68,
        "Plot on surface (white): azure clears 3:1 there and misses it on the tinted background.",
        14,
        palette.INK_MUTED,
    )

    y = _MARGIN + _TITLE_BLOCK_H
    for label, swatches in _GROUPS:
        text(_MARGIN, y, label.upper(), 14, palette.INK, bold=True)
        y += _GROUP_LABEL_H
        for index, (name, colour) in enumerate(swatches):
            x = _MARGIN + index * (_SWATCH_W + _GAP)
            draw.rectangle(
                [at(x), at(y), at(x + _SWATCH_W), at(y + _SWATCH_H)],
                fill=colour,
                outline=palette.BORDER,
            )
            ratio = palette.contrast(colour, palette.SURFACE)
            text(x, y + _SWATCH_H + 8, name, 14, palette.INK, bold=True)
            text(x, y + _SWATCH_H + 26, colour.upper(), 13, palette.INK_MUTED)
            caption = f"{ratio:.1f}:1"
            if colour in _FILL_ONLY:
                caption = "fill only"
            elif ratio < 1.5:
                caption = "—"  # background tokens have no meaningful ratio
            text(x, y + _SWATCH_H + 42, caption, 12, palette.INK_MUTED)
        y += _SWATCH_H + _LABEL_H + _GROUP_GAP

    text(
        _MARGIN,
        _height() - _MARGIN - 18,
        "Ratios measured against white. Gold is a fill colour only — "
        "use gold-ink for lines and text.",
        13,
        palette.INK_MUTED,
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    image.resize((_WIDTH, _height()), Image.LANCZOS).save(OUTPUT_PATH)
    return OUTPUT_PATH


def main() -> Path:
    """CLI entry point."""
    path = render()
    print(path)
    return path
