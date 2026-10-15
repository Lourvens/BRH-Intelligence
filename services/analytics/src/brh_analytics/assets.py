"""Where the bundled assets live, and how to load them.

Montserrat is the brand face and Inter carries the data, but neither ships with
a Linux box. Drop the TTFs into ``assets/fonts/`` and every renderer picks them
up; until then we fall back to DejaVu. Local files keep rendering offline and
deterministic — a web font fetched at draw time would be neither.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

from PIL import Image, ImageFont

ASSETS_DIR = Path(__file__).resolve().parents[2] / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"

_BUNDLED = {
    False: ("Montserrat-Regular.ttf", "Inter-Regular.ttf"),
    True: ("Montserrat-Bold.ttf", "Inter-Bold.ttf"),
}
_SYSTEM = {
    False: Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    True: Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
}


@lru_cache(maxsize=64)
def font(size: int, *, bold: bool = False, scale: int = 1) -> Any:
    """A PIL font at ``size`` points, ``scale`` times bigger for supersampling."""
    for name in _BUNDLED[bold]:
        candidate = FONTS_DIR / name
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size * scale)
    if _SYSTEM[bold].exists():
        return ImageFont.truetype(str(_SYSTEM[bold]), size * scale)
    return ImageFont.load_default(size * scale)


def logo() -> Any | None:
    """The BRH mark, if it has been saved to ``assets/logo.png``.

    The site serves it at ``themes/brh/img/logo.png``. It is BRH's mark, never
    ours to recolour or stretch (it is 251x123, about 2.04:1).
    """
    path = ASSETS_DIR / "logo.png"
    return Image.open(path) if path.exists() else None
