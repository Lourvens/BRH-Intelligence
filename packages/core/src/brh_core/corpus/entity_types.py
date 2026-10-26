"""Reject standalone temporal labels from the research entity taxonomy."""

import re

from brh_core.corpus.metadata import normalize

MONTH = (
    r"janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|"
    r"novembre|decembre|janv\.?|fevr\.?|avr\.?|juil\.?|sept\.?|oct\.?|nov\.?|dec\.?"
)
DATE_LABEL = re.compile(
    rf"(?:\d{{4}}[-/]\d{{1,2}}[-/]\d{{1,2}}|\d{{1,2}}[/.\-]\d{{1,2}}[/.\-]\d{{2,4}}"
    rf"|\d{{1,2}}(?:er|e)?\s+(?:{MONTH})(?:\s+\d{{4}})?"
    rf"|(?:{MONTH})\s+\d{{4}}|(?:18|19|20|21)\d{{2}})",
    re.IGNORECASE,
)


def is_temporal_label(value: str) -> bool:
    return bool(DATE_LABEL.fullmatch(normalize(value).strip(" .,:;()")))
