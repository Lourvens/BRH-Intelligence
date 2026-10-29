"""Deterministic contract and stability scoring for live agent trials."""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from .cases import BehaviorCase, CitationPolicy


@dataclass(frozen=True)
class Score:
    score: float
    label: str
    explanation: str
    metadata: dict[str, int | float | str]


def _runs(output: Any) -> list[Mapping[str, Any]]:
    if not isinstance(output, Mapping):
        return []
    runs = output.get("runs")
    return [run for run in runs if isinstance(run, Mapping)] if isinstance(runs, list) else []


def contract_failures(case: BehaviorCase, run: Mapping[str, Any]) -> tuple[str, ...]:
    failures = []
    if not run.get("transport_ok"):
        return ("transport",)
    if run.get("phase") != "complete":
        failures.append("phase")
    kind = str(run.get("kind", ""))
    if kind not in case.expected_kinds:
        failures.append("kind")
    if case.require_no_plan and run.get("has_plan"):
        failures.append("unexpected_plan")
    if case.expected_mode is not None and run.get("mode") != case.expected_mode:
        failures.append("mode")
    goal_count = int(run.get("goal_count", 0))
    if not case.min_goals <= goal_count <= case.max_goals:
        failures.append("goal_count")
    citation_count = int(run.get("citation_count", 0))
    if case.citation_policy == CitationPolicy.FORBIDDEN and citation_count:
        failures.append("citations_forbidden")
    if case.citation_policy == CitationPolicy.REQUIRED and citation_count < 1:
        failures.append("citations_required")
    if (
        case.citation_policy == CitationPolicy.REQUIRED_FOR_ANSWER
        and kind in {"answer", "partial"}
        and citation_count < 1
    ):
        failures.append("citations_required")
    if case.max_model_calls is not None and int(run.get("model_calls", 0)) > case.max_model_calls:
        failures.append("model_call_budget")
    if case.preserve_numbers:
        question_numbers = set(run.get("question_numbers", []))
        plan_numbers = set(run.get("plan_numbers", []))
        if not question_numbers <= plan_numbers:
            failures.append("numbers_lost")
    return tuple(failures)


def score_contract(case: BehaviorCase, output: Any) -> Score:
    runs = _runs(output)
    if not runs:
        return Score(0, "fail", "No trials were returned.", {"trials": 0, "passed": 0})
    failures = [contract_failures(case, run) for run in runs]
    passed = sum(not failure for failure in failures)
    counts = Counter(item for failure in failures for item in failure)
    explanation = f"{passed}/{len(runs)} trials met the reviewed behavior contract." + (
        f" Failures: {dict(counts)}." if counts else ""
    )
    return Score(
        passed / len(runs),
        "pass" if passed == len(runs) else "fail",
        explanation,
        {"trials": len(runs), "passed": passed, **dict(counts)},
    )


def score_stability(output: Any) -> Score:
    runs = _runs(output)
    completed = [run for run in runs if run.get("transport_ok")]
    if not completed:
        return Score(0, "unstable", "No completed trials to compare.", {"trials": len(runs)})
    signatures = Counter(
        (
            str(run.get("kind", "")),
            str(run.get("route", "")),
            str(run.get("mode", "")),
            int(run.get("goal_count", 0)),
            bool(run.get("citation_count", 0)),
        )
        for run in completed
    )
    dominant = max(signatures.values())
    score = dominant / len(completed)
    return Score(
        score,
        "stable" if score == 1 else "unstable",
        f"Dominant behavior signature occurred in {dominant}/{len(completed)} completed trials.",
        {"trials": len(runs), "completed": len(completed), "signatures": len(signatures)},
    )


def score_availability(output: Any) -> Score:
    runs = _runs(output)
    available = sum(bool(run.get("transport_ok")) for run in runs)
    score = available / len(runs) if runs else 0
    return Score(
        score,
        "available" if runs and available == len(runs) else "unavailable",
        f"{available}/{len(runs)} Agent Server trials completed without a transport error.",
        {"trials": len(runs), "available": available},
    )
