"""Conservative metadata inference for the research projection."""

import re
import unicodedata
from html import unescape

FAMILY_PATTERNS = {
    "circular": r"circulaire|lignes directrices",
    "inflation": r"inflation",
    "annual-report": r"rapport annuel|bilan",
    "bulletin": r"bulletin|conjoncture",
    "notice": r"avis|communiqu[eé]",
    "study": r"[eé]tude|recherche|document de travail",
}


def normalize(value: str) -> str:
    folded = unicodedata.normalize("NFKD", value.casefold())
    return " ".join("".join(c for c in folded if not unicodedata.combining(c)).split())


def family_for(title: str) -> str:
    return next(
        (key for key, pattern in FAMILY_PATTERNS.items() if re.search(pattern, title, re.I)),
        "unknown",
    )


def reading_title(markdown: str, fallback: str) -> str:
    headings = re.findall(r"^#{1,4}\s+(.+)$", markdown, re.M)
    return next((title for heading in headings if (title := clean_title(heading))), fallback)


def clean_title(value: str | None) -> str | None:
    if not value or re.search(r"!\[|<img\b|^[a-f0-9]{32,}", value, re.I):
        return None
    title = " ".join(unescape(re.sub(r"<[^>]*>", "", value)).split()).strip("# *_")
    if not title or re.fullmatch(r"[\W\d_]+", title):
        return None
    return title[:240]


def covered_period(title: str, markdown: str) -> tuple[str | None, list[int]]:
    years = sorted({int(value) for value in re.findall(r"\b(?:19|20)\d{2}\b", title)})
    if years:
        return " / ".join(map(str, years)), years
    if family_for(title) != "annual-report" and normalize(title) not in {
        "avant-propos",
        "avant propos",
        "rapport",
    }:
        return None, []
    match = re.search(
        r"(?:exercice(?: fiscal)?|p[eé]riode)\s+(\d{4})\s*[-–/]\s*(\d{4})", markdown[:3000], re.I
    )
    if match and 0 <= int(match[2]) - int(match[1]) <= 1:
        years = list(range(int(match[1]), int(match[2]) + 1))
        return f"{match[1]}–{match[2]}", years
    return None, []
