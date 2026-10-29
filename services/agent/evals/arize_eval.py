"""Arize evaluator adapters over the deterministic behavior scorers."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from arize.experiments import EvaluationResult, Evaluator

from .cases import case_from_mapping
from .scoring import Score, score_availability, score_contract, score_stability


def _result(score: Score) -> EvaluationResult:
    return EvaluationResult(
        score=score.score,
        label=score.label,
        explanation=score.explanation,
        metadata=score.metadata,
    )


class BehaviorContractEvaluator(Evaluator):
    def evaluate(
        self,
        *,
        dataset_row: Mapping[str, Any] | None = None,
        output: Any = None,
        **kwargs: object,
    ) -> EvaluationResult:
        del kwargs
        if dataset_row is None:
            return EvaluationResult(score=0, label="fail", explanation="Missing dataset row.")
        return _result(score_contract(case_from_mapping(dataset_row), output))


class StabilityEvaluator(Evaluator):
    def evaluate(self, *, output: Any = None, **kwargs: object) -> EvaluationResult:
        del kwargs
        return _result(score_stability(output))


class AvailabilityEvaluator(Evaluator):
    def evaluate(self, *, output: Any = None, **kwargs: object) -> EvaluationResult:
        del kwargs
        return _result(score_availability(output))


def evaluators() -> list[Evaluator]:
    return [BehaviorContractEvaluator(), StabilityEvaluator(), AvailabilityEvaluator()]
