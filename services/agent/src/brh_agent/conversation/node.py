"""Stream a conversational reply without touching retrieval."""

import logging
from collections.abc import Callable
from typing import Any

from langgraph.config import get_stream_writer

from brh_agent.activity import emit
from brh_agent.conversation.agent import respond
from brh_agent.publication import ERROR, interrupted_or_error, publish

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
    try:
        text = ERROR if failed else respond(state, model_factory(), on_chunk)
    except Exception:
        logger.exception("Conversation response failed")
        failed = True
        text = interrupted_or_error(parts)
    emit(state["turn_id"], "respond", "error" if failed else "complete")
    return publish(text, [], "error" if failed else "conversation", state["turn_id"])
