"""French number and date formatting.

French typography separates thousands with a narrow no-break space, uses a
comma for decimals, and puts a no-break space before ``%``. Getting this wrong
is the fastest way to look foreign in a Haitian publication, so it lives in one
place rather than being re-invented per chart.
"""

from __future__ import annotations

from datetime import date

NARROW_SPACE = "\u202f"  # espace fine insécable
NO_BREAK_SPACE = "\u00a0"  # espace insécable
_MONTHS = (
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre",
)


def fr_number(value: float, *, decimals: int = 0) -> str:
    """``1234567`` -> ``1 234 567``; ``24.3`` with 1 decimal -> ``24,3``."""
    formatted = f"{value:,.{decimals}f}"
    return formatted.replace(",", NARROW_SPACE).replace(".", ",")


def fr_percent(value: float, *, decimals: int = 1) -> str:
    """``24.3`` -> ``24,3 %`` (no-break space, French style)."""
    return f"{fr_number(value, decimals=decimals)}{NO_BREAK_SPACE}%"


def fr_date(value: date) -> str:
    """``date(2026, 10, 15)`` -> ``15 octobre 2026``."""
    return f"{value.day} {_MONTHS[value.month - 1]} {value.year}"


def fr_date_short(value: date) -> str:
    """``date(2026, 10, 15)`` -> ``15/10/2026``."""
    return f"{value.day:02d}/{value.month:02d}/{value.year}"


def fr_bytes(value: int) -> str:
    """Decimal units, French convention: ``506`` MB rather than ``483`` MiB.

    Decimal is the honest choice here — a PDF's size on a web server is
    measured in powers of ten, and the marketroid ``MB`` that means ``MiB`` is
    exactly the kind of quiet lie this project avoids.
    """
    for unit, divisor in (("Go", 1_000_000_000), ("Mo", 1_000_000), ("ko", 1_000)):
        if value >= divisor:
            return f"{fr_number(value / divisor, decimals=1)} {unit}"
    return f"{fr_number(value)} o"
