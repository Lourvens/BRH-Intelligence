"""Stream a conversational reply without touching retrieval."""

import logging
from collections.abc import Callable
from typing import Any

from langgraph.config import get_stream_writer

from brh_agent.lib.activity import emit
from brh_agent.lib.publication import ERROR, interrupted_or_error, publish
from brh_agent.usage.tokens import add_usage
from brh_agent.workflow.conversation.agent import respond

logger = logging.getLogger(__name__)


def converse(
    state: dict[str, Any],
    model_factory: Callable[[], Any],
) -> dict[str, Any]:
    emit(state["turn_id"], "respond", "running")
    parts: list[str] = []

    def on_chunk(chunk: str) -> None:
        parts.append(chunk)
        get_stream_writer()(
            {"type": "brh.answer.delta", "turn_id": state["turn_id"], "text": chunk}
        )

    failed = state["intent"] == "error"
    usage: dict[str, int] = {}
    try:
        if failed:
            text = ERROR
        else:
            text, usage = respond(state, model_factory(), on_chunk)
    except Exception:
        logger.exception("Conversation response failed")
        failed = True
        text = interrupted_or_error(parts)
    emit(state["turn_id"], "respond", "error" if failed else "complete")
    result = publish(text, [], "error" if failed else "conversation", state["turn_id"])
    result["usage"] = add_usage(state.get("usage"), usage)
    return result
