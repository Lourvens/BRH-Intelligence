"""Route each user turn using the decision model and conversation context."""

import logging

from langchain_core.messages import AIMessage, HumanMessage

logger = logging.getLogger(__name__)


def route_turn(state, decide):
    history = [
        {
            "role": "utilisateur" if isinstance(message, HumanMessage) else "assistant",
            "contenu": str(message.content)[:4000],
        }
        for message in state.get("messages", [])
        if isinstance(message, (HumanMessage, AIMessage)) and not getattr(message, "tool_calls", [])
    ][-8:]
    try:
        intent = decide(history)
    except Exception:
        logger.exception("Intent classification failed")
        intent = "error"
    return {
        "intent": intent,
        "research_messages": [],
        "searches": 0,
        "citations": [],
        "grounded": False,
        "answer": "",
        "kind": "",
    }
