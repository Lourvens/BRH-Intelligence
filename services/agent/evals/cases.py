"""Versioned behavior-case contracts loaded from the reviewed JSONL dataset."""

from __future__ import annotations

import json
from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from pathlib import Path
from typing import Any

DATASET_PATH = Path(__file__).with_name("dataset.jsonl")
ALLOWED_KINDS = {
    "answer",
    "budget_exhausted",
    "clarification",
    "conversation",
    "insufficient",
    "partial",
    "safe_limitation",
    "scope_limit",
    "unavailable",
}
ALLOWED_MODES = {"clarify", "conversation", "decomposed", "direct", "out_of_scope"}


class CitationPolicy(StrEnum):
    FORBIDDEN = "forbidden"
    REQUIRED = "required"
    REQUIRED_FOR_ANSWER = "required_for_answer"


@dataclass(frozen=True)
class BehaviorCase:
    case_id: str
    category: str
    question: str
    expected_kinds: tuple[str, ...]
    expected_mode: str | None
    min_goals: int
    max_goals: int
    citation_policy: CitationPolicy
    max_model_calls: int | None
    require_no_plan: bool
    preserve_numbers: bool
    notes: str

    def as_arize_example(self) -> dict[str, object]:
        """Return one flat, JSON-serializable Arize dataset example."""
        return {
            "case_id": self.case_id,
            "category": self.category,
            "question": self.question,
            "expected_kinds": list(self.expected_kinds),
            "expected_mode": self.expected_mode,
            "min_goals": self.min_goals,
            "max_goals": self.max_goals,
            "citation_policy": self.citation_policy.value,
            "max_model_calls": self.max_model_calls,
            "require_no_plan": self.require_no_plan,
            "preserve_numbers": self.preserve_numbers,
            "notes": self.notes,
        }


def _unwrap_arize_row(row: Mapping[str, Any]) -> Mapping[str, Any]:
    nested = row.get("attributes.input.value") or row.get("input")
    if isinstance(nested, Mapping) and "case_id" in nested:
        return nested
    return row


def case_from_mapping(row: Mapping[str, Any]) -> BehaviorCase:
    value = _unwrap_arize_row(row)
    raw_kinds = value["expected_kinds"]
    if isinstance(raw_kinds, str):
        try:
            raw_kinds = json.loads(raw_kinds)
        except json.JSONDecodeError as exc:
            raise ValueError("expected_kinds must be a JSON list") from exc
    if not isinstance(raw_kinds, list):
        raise ValueError("expected_kinds must be a list")
    expected_kinds = tuple(str(kind) for kind in raw_kinds)
    expected_mode = value.get("expected_mode")
    case = BehaviorCase(
        case_id=str(value["case_id"]),
        category=str(value["category"]),
        question=str(value["question"]),
        expected_kinds=expected_kinds,
        expected_mode=str(expected_mode) if expected_mode is not None else None,
        min_goals=int(value.get("min_goals", 0)),
        max_goals=int(value.get("max_goals", 4)),
        citation_policy=CitationPolicy(str(value["citation_policy"])),
        max_model_calls=(
            int(value["max_model_calls"]) if value.get("max_model_calls") is not None else None
        ),
        require_no_plan=bool(value.get("require_no_plan", False)),
        preserve_numbers=bool(value.get("preserve_numbers", False)),
        notes=str(value.get("notes", "")),
    )
    validate_case(case)
    return case


def validate_case(case: BehaviorCase) -> None:
    if not case.case_id or not case.question.strip() or not case.category:
        raise ValueError("case_id, category and question are required")
    if not case.expected_kinds or not set(case.expected_kinds) <= ALLOWED_KINDS:
        raise ValueError(f"{case.case_id}: invalid expected_kinds")
    if case.expected_mode is not None and case.expected_mode not in ALLOWED_MODES:
        raise ValueError(f"{case.case_id}: invalid expected_mode")
    if not 0 <= case.min_goals <= case.max_goals <= 4:
        raise ValueError(f"{case.case_id}: invalid goal bounds")
    if case.max_model_calls is not None and case.max_model_calls < 0:
        raise ValueError(f"{case.case_id}: invalid max_model_calls")
    if case.require_no_plan and (case.expected_mode is not None or case.max_goals != 0):
        raise ValueError(f"{case.case_id}: no-plan cases cannot expect a plan")


def load_cases(path: Path = DATASET_PATH) -> tuple[BehaviorCase, ...]:
    cases = []
    for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        try:
            cases.append(case_from_mapping(json.loads(line)))
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise ValueError(f"Invalid evaluation case at {path}:{line_number}: {exc}") from exc
    identifiers = [case.case_id for case in cases]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError("Evaluation case IDs must be unique")
    if not cases:
        raise ValueError("Evaluation dataset cannot be empty")
    return tuple(cases)
