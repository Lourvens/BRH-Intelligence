"""Graph node wrappers for bounded document research."""

import logging
from collections.abc import Callable
from typing import Any

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.config import get_stream_writer

from brh_agent.lib.activity import emit
from brh_agent.lib.publication import ERROR, interrupted_or_error, publish
from brh_agent.workflow.research import agent as research

logger = logging.getLogger(__name__)

FINAL_WRITER_INSTRUCTIONS = (
    "Rédigez la réponse finale en français. "
    "Utilisez les passages retrouvés et leurs références [1], [2]. "
    "Gardez les raisonnements privés. Adaptez la longueur à la question."
)


def start(state: dict[str, Any]) -> dict[str, Any]:
    return research.start(state)


def think(
    state: dict[str, Any],
    model_factory: Callable[[], Any],
    search_tool: Any,
) -> dict[str, Any]:
    emit(state["turn_id"], "assess_coverage", "running", event_id=f"draft:{state['searches']}")
    try:
        result = research.think(state, model_factory(), search_tool)
        emit(
            state["turn_id"],
            "assess_coverage",
            "complete",
            event_id=f"draft:{state['searches']}",
        )
        return result
    except Exception:
        emit(
            state["turn_id"],
            "assess_coverage",
            "error",
            event_id=f"draft:{state['searches']}",
        )
        logger.exception("Research model failed")
        return {"research_messages": [*state["research_messages"], AIMessage(content=ERROR)]}


def search(state: dict[str, Any], search_tool: Any) -> dict[str, Any]:
    return research.search(
        state,
        search_tool,
        lambda status, **details: emit(state["turn_id"], "search", status, **details),
    )


def final(state: dict[str, Any], model_factory: Callable[[], Any]) -> dict[str, Any]:
    last = state["research_messages"][-1]
    if last.content == ERROR:
        return publish(ERROR, [], "error", state["turn_id"])
    if not state["citations"]:
        text, citations = research.answer(state)
        return publish(text, citations, "answer", state["turn_id"])
    emit(state["turn_id"], "draft", "running", event_id="final-writer")
    parts: list[str] = []
    try:
        history = [
            *state["research_messages"],
            HumanMessage(content=FINAL_WRITER_INSTRUCTIONS),
        ]
        for sequence, chunk in enumerate(model_factory().stream(history)):
            if isinstance(chunk.content, str) and chunk.content:
                parts.append(chunk.content)
                get_stream_writer()(
                    {
                        "type": "brh.answer.delta",
                        "turn_id": state["turn_id"],
                        "sequence": sequence,
                        "text": chunk.content,
                    }
                )
        emit(state["turn_id"], "draft", "complete", event_id="final-writer")
        text, citations = research.answer(
            {**state, "research_messages": [AIMessage(content="".join(parts))]}
        )
        return publish(text, citations, "answer", state["turn_id"])
    except Exception:
        logger.exception("Final writer failed")
        emit(state["turn_id"], "draft", "error", event_id="final-writer")
        return publish(interrupted_or_error(parts), [], "error", state["turn_id"])


def next_step(state: dict[str, Any]) -> str:
    message = state["research_messages"][-1]
    return (
        "tools"
        if getattr(message, "tool_calls", None) and state["searches"] < research.MAX_SEARCHES
        else "final"
    )
