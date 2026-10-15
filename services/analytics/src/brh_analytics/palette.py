"""BRH colour tokens — one source of truth for every chart and asset.

Sampled from brh.ht itself:

* the site logo is a flat ``#031A71`` navy — it is monochrome, so that one
  value is the strongest brand anchor available;
* the theme's own CSS leans on ``#012A67`` / ``#05155B`` navy, ``#1E4B9E``
  blue and ``#005B8A`` deep blue, with ``#009CDC`` azure, ``#E8D833`` gold and
  ``#593196`` purple as accents;
* headings are set in Montserrat, buttons in Poppins.

Two brand colours cannot carry text, so they were darkened rather than dropped:
``GOLD`` (1.5:1 on white) is a fill colour only, and ``GOLD_INK`` is the same
hue at 3.8:1. :func:`contrast` makes those thresholds checkable instead of
conventional.

The numbers imply one layout rule worth repeating: **plot on ``SURFACE``
(white), never on ``BG``.** Azure clears 3:1 on white and misses it on the
tinted page background.

The rules that govern how these are used live in ``DESIGN.md``.
"""

# --- Brand ------------------------------------------------------------------
NAVY = "#031A71"  # the logo; the default series colour
NAVY_DEEP = "#05155B"  # dark surfaces, gradient base
NAVY_700 = "#012A67"  # headings and links on light
BLUE = "#1E4B9E"  # secondary
TEAL = "#005B8A"  # tertiary
AZURE = "#009CDC"  # accent, highlight (3.1:1 on white)
GOLD = "#E8D833"  # accent — FILL ONLY (1.5:1 on white)
GOLD_INK = "#A67C00"  # the same hue, safe for lines and text (3.8:1)
PURPLE = "#593196"  # accent
SCARLET = "#C8102E"  # negative, alert
EMERALD = "#0E7C66"  # positive
STEEL = "#5279B3"  # muted series colour

# --- Neutrals ---------------------------------------------------------------
BG = "#F7F9FC"  # page background
SURFACE = "#FFFFFF"  # panels and chart areas — plot here, not on BG
SURFACE_ALT = "#EEF3FA"  # zebra rows, inset blocks
BORDER = "#E3E9F2"  # hairlines and gridlines
INK = "#0B1729"  # primary text (18.0:1)
INK_MUTED = "#5A6B87"  # captions, axis labels (5.4:1)

# --- Chart scales -----------------------------------------------------------
# Categorical rotation, ordered so the first two or three read well together.
# Past six series, facet or aggregate instead of inventing more colours.
SERIES: tuple[str, ...] = (NAVY, AZURE, GOLD_INK, PURPLE, TEAL, STEEL)

# Semantic pairs. Never the only signal — pair with a sign, arrow or label,
# because red/green is the most common colour-blind confusion.
SEMANTIC: dict[str, str] = {"positive": EMERALD, "negative": SCARLET}

# Sequential ramp for heatmaps, light to dark.
SEQUENTIAL: tuple[str, ...] = ("#EEF3FA", "#C7D8F5", "#8FB0E8", "#5279B3", "#1E4B9E", NAVY)

# Contrast thresholds, WCAG 2.1 AA.
CONTRAST_TEXT = 4.5
CONTRAST_UI = 3.0

# Tokens expected to stay legible as text on a light surface.
TEXT_ON_LIGHT: dict[str, str] = {"ink": INK, "ink-muted": INK_MUTED}


def _channel(value: int) -> float:
    srgb = value / 255
    return srgb / 12.92 if srgb <= 0.04045 else ((srgb + 0.055) / 1.055) ** 2.4


def relative_luminance(colour: str) -> float:
    """WCAG 2.1 relative luminance of a ``#rrggbb`` string."""
    raw = colour.lstrip("#")
    red, green, blue = (int(raw[index : index + 2], 16) for index in (0, 2, 4))
    return 0.2126 * _channel(red) + 0.7152 * _channel(green) + 0.0722 * _channel(blue)


def contrast(foreground: str, background: str) -> float:
    """WCAG 2.1 contrast ratio: 1.0 (identical) to 21.0 (black on white)."""
    first, second = relative_luminance(foreground), relative_luminance(background)
    lighter, darker = max(first, second), min(first, second)
    return (lighter + 0.05) / (darker + 0.05)


def check() -> dict[str, float]:
    """Contrast of every token that has a threshold, measured against white.

    Returned as data so tests assert the accessibility contract rather than a
    comment claiming it. ``GOLD`` is deliberately absent: it is a fill colour,
    and no threshold applies.
    """
    ratios: dict[str, float] = {
        f"text.{name}": contrast(colour, SURFACE) for name, colour in TEXT_ON_LIGHT.items()
    }
    ratios |= {f"series.{index}": contrast(colour, SURFACE) for index, colour in enumerate(SERIES)}
    ratios |= {f"semantic.{name}": contrast(colour, SURFACE) for name, colour in SEMANTIC.items()}
    return ratios
