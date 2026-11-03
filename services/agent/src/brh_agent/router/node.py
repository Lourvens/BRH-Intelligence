"""Route one turn and tag its state update with a turn id."""

from collections.abc import Callable
from typing import Any
from uuid import uuid4

from brh_agent.activity import emit
from brh_agent.router.agent import route_turn


def route(
    state: dict[str, Any],
    decision: Callable[[list[dict[str, str]]], str],
) -> dict[str, Any]:
    turn_id = str(uuid4())
    emit(turn_id, "route_intent", "running")
    result = route_turn(state, decision)
    emit(turn_id, "route_intent", "error" if result["intent"] == "error" else "complete")
    return {**result, "turn_id": turn_id}
