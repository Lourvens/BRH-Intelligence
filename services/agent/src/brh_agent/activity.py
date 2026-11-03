"""Stream and buffer per-turn activity events for the assistant graph."""

from collections.abc import Callable
from contextvars import ContextVar
from typing import Any

from langchain_core.messages import AIMessage
from langgraph.config import get_stream_writer

activity_buffer: ContextVar[list[dict[str, Any]] | None] = ContextVar(
    "activity_buffer", default=None
)


def emit(turn_id: str, stage: str, status: str, **details: Any) -> None:
    """Stream one activity event and retain it for the published answer."""
    event = {
        "type": "brh.activity",
        "turn_id": turn_id,
        "id": details.pop("event_id", stage),
        "stage": stage,
        "status": status,
        **details,
    }
    get_stream_writer()(event)
    buffer = activity_buffer.get()
    if buffer is not None:
        buffer.append(event)


def tracked(
    node: Callable[[dict[str, Any]], dict[str, Any]],
) -> Callable[[dict[str, Any]], dict[str, Any]]:
    """Wrap a node so its emitted events merge into the turn's activity list."""

    def run(state: dict[str, Any]) -> dict[str, Any]:
        events: list[dict[str, Any]] = []
        token = activity_buffer.set(events)
        try:
            result = node(state)
        finally:
            activity_buffer.reset(token)
        turn_id = result.get("turn_id", state.get("turn_id"))
        previous = [
            event for event in state.get("activities", []) if event["turn_id"] == turn_id
        ]
        merged = {event["id"]: event for event in [*previous, *events]}
        result["activities"] = list(merged.values())
        for message in result.get("messages", []):
            if isinstance(message, AIMessage) and "brh" in message.additional_kwargs:
                message.additional_kwargs["brh"]["activities"] = result["activities"]
        return result

    return run
