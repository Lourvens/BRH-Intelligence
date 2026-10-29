"""Repeated live execution against the UI-facing LangGraph Agent Server contract."""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any
from uuid import uuid4

import httpx

from .cases import BehaviorCase, case_from_mapping

NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


@dataclass(frozen=True)
class AgentServerRunner:
    endpoint: str
    assistant_id: str = "agent"
    repetitions: int = 3
    timeout: float = 210

    def __post_init__(self) -> None:
        if self.repetitions < 1 or self.repetitions > 10:
            raise ValueError("repetitions must be between 1 and 10")
        if self.timeout <= 0:
            raise ValueError("timeout must be positive")

    def run_case(self, case: BehaviorCase) -> dict[str, object]:
        with httpx.Client(timeout=self.timeout) as client:
            runs = [self._run_once(client, case, index) for index in range(self.repetitions)]
        return {"case_id": case.case_id, "runs": runs}

    def _run_once(
        self, client: httpx.Client, case: BehaviorCase, trial_index: int
    ) -> dict[str, object]:
        started = time.monotonic()
        try:
            response = client.post(
                self.endpoint,
                json={
                    "assistant_id": self.assistant_id,
                    "input": {
                        "messages": [
                            {
                                "type": "human",
                                "content": case.question,
                                "id": f"eval-{case.case_id}-{trial_index}-{uuid4()}",
                            }
                        ]
                    },
                    "config": {"recursion_limit": 80},
                },
            )
            response.raise_for_status()
            state = response.json()
        except (httpx.HTTPError, json.JSONDecodeError) as exc:
            return {
                "trial": trial_index + 1,
                "transport_ok": False,
                "duration_ms": round((time.monotonic() - started) * 1000),
                "error_type": type(exc).__name__,
            }
        plan = state.get("plan") if isinstance(state.get("plan"), dict) else {}
        citations = state.get("citations") if isinstance(state.get("citations"), list) else []
        goals = plan.get("goals") if isinstance(plan.get("goals"), list) else []
        return {
            "trial": trial_index + 1,
            "transport_ok": True,
            "duration_ms": round((time.monotonic() - started) * 1000),
            "kind": state.get("kind"),
            "phase": state.get("phase"),
            "route": state.get("route"),
            "has_plan": bool(plan),
            "mode": plan.get("mode"),
            "intent": plan.get("intent"),
            "goal_count": len(goals),
            "model_calls": int(state.get("model_calls", 0)),
            "support": state.get("support"),
            "citation_count": len(citations),
            "answer": str(state.get("answer", ""))[:12_000],
            "question_numbers": NUMBER.findall(case.question),
            "plan_numbers": NUMBER.findall(json.dumps(plan, ensure_ascii=False)),
        }


def build_arize_task(runner: AgentServerRunner):
    """Adapt the runner to Arize's ``ExperimentTask(Example)`` callable."""

    def task(example: Any) -> dict[str, object]:
        return runner.run_case(case_from_mapping(example.dataset_row))

    return task
