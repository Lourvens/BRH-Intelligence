"""Vocabulary of the corpus, as regular expressions.

One home for the patterns that decide "is this a heading / a period / a unit".
They are shared by the parser (which structure to recognise), the envelope
(which context to keep) and the table policy (how to group rows), and they must
not drift apart — a period recognised in one place and not another is exactly
how a series gets split in the middle.
"""

from __future__ import annotations

import re

# --- markdown structure ----------------------------------------------------
HEADING = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
GFM_ROW = re.compile(r"^\s*\|")
HTML_TABLE_START = re.compile(r"<table\b", re.IGNORECASE)
HTML_TABLE_END = re.compile(r"</table>", re.IGNORECASE)
SEPARATOR_CELL = re.compile(r"^:?-{2,}:?$")
ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.IGNORECASE)
CELL = re.compile(r"<t([dh])\b[^>]*>(.*?)</t\1>", re.S | re.IGNORECASE)
TAG = re.compile(r"<[^>]+>")

# --- French document vocabulary --------------------------------------------
PERIOD_CELL = re.compile(
    r"^\s*(?:janv|f[ée]vr|mars|avril|mai|juin|juil|ao[uû]t|sept|oct|nov|d[ée]c"
    r"|\d{1,2}[/-]\d{2,4}|(?:19|20)\d{2}|T[1-4]|[1-4]\s*(?:er|e)?\s*trim)",
    re.IGNORECASE,
)
PERIOD = re.compile(r"\b(?:19|20)\d{2}\b|\b[1-4]\s*(?:er|e)\s*trimestre\b", re.IGNORECASE)
YEAR = re.compile(r"\b(?:19|20)\d{2}\b")
CAPTION = re.compile(r"^\s*(tableau|table|graphique|figure|annexe|encadr[ée])\b", re.IGNORECASE)
#: Only the unit token — never a free-text tail. An earlier version captured
#: 40 characters after "unité", which on an HTML table swallowed cell markup
#: into the envelope title.
UNIT = re.compile(
    r"en\s*%|\ben\s+[a-zàâäçéèêëîïôöùûüÿœæ]{3,12}\b|\bunit[ée]s?\b|\bmillions?\b"
    r"|\bmilliards?\b|\bgourdes?\b|\bhtg\b|\busd\b|\bpoints? de base\b|\bindice\b",
    re.IGNORECASE,
)
SOURCE = re.compile(r"source\s*:\s*(.+)", re.IGNORECASE)
PROVISION_ITEM = re.compile(r"^\s*(?:[a-z]\)|\(?\d+\)?[.)]\s+\S)")
REGULATORY = re.compile(
    r"\b(circulaire|avis|communiqu[ée]|loi|d[ée]cret|r[èe]glement)\b", re.IGNORECASE
)
