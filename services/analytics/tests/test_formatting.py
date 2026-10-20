"""French typography, which every family and chart depends on."""

from __future__ import annotations

from datetime import date

from brh_analytics.formatting import (
    NO_BREAK_SPACE,
    fr_date_short,
    fr_duration,
    fr_number,
    fr_percent,
)


def test_numbers_use_narrow_no_break_spaces_and_a_comma() -> None:
    assert fr_number(1_169) == "1\u202f169"
    assert fr_number(22.58, decimals=1) == "22,6"


def test_percent_carries_a_no_break_space() -> None:
    assert fr_percent(28.2) == f"28,2{NO_BREAK_SPACE}%"


def test_dates_are_day_first() -> None:
    assert fr_date_short(date(2026, 10, 15)) == "15/10/2026"


def test_duration_climbs_seconds_to_minutes_to_hours() -> None:
    assert fr_duration(2.2) == "2 s"
    assert fr_duration(87) == "1 min 27 s"
    assert fr_duration(120) == "2 min"
    assert fr_duration(1_939.9) == "32 min 20 s"
    assert fr_duration(50_007) == "13 h 53"
