"""Route one turn and tag its state update with a turn id."""

from collections.abc import Callable
from typing import Any
from uuid import uuid4

from brh_agent.lib.activity import emit
from brh_agent.usage.tokens import estimate_usage
from brh_agent.workflow.router.agent import route_turn


def route(
    state: dict[str, Any],
    decision: Callable[[list[dict[str, str]]], str],
) -> dict[str, Any]:
    turn_id = str(uuid4())
    emit(turn_id, "route_intent", "running")
    result = route_turn(state, decision)
    emit(turn_id, "route_intent", "error" if result["intent"] == "error" else "complete")
    # Each turn resets the usage accumulator; the decision endpoint does not
    # return usage, so charge its prompt through the approximate count.
    return {
        **result,
        "turn_id": turn_id,
        "usage": estimate_usage(state.get("messages", [])),
    }
