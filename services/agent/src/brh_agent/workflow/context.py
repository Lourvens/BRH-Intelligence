"""Keep each thread's model context inside an env-configured budget."""

from __future__ import annotations

from typing import Any

from brh_core.config import get_settings
from langchain_core.messages import BaseMessage, RemoveMessage
from langchain_core.messages.utils import count_tokens_approximately, trim_messages


def trim_context(
    messages: list[BaseMessage], *, max_tokens: int, max_messages: int
) -> list[RemoveMessage]:
    """Return removals for messages outside the configured context window."""
    if not messages:
        return []

    window = messages[-max_messages:]
    kept = trim_messages(
        window,
        strategy="last",
        token_counter=count_tokens_approximately,
        max_tokens=max_tokens,
        start_on="human",
        end_on=("human", "tool"),
        allow_partial=True,
    )
    if not kept:
        kept = [messages[-1]]

    kept_ids = {message.id for message in kept if getattr(message, "id", None)}
    return [
        RemoveMessage(id=message.id)
        for message in messages
        if getattr(message, "id", None) and message.id not in kept_ids
    ]


def limit_context(state: dict[str, Any]) -> dict[str, list[RemoveMessage]]:
    """Apply the env-configured context budget to a thread turn."""
    messages: list[BaseMessage] = state.get("messages", [])
    settings = get_settings()
    removed = trim_context(
        messages,
        max_tokens=settings.agent_max_context_tokens,
        max_messages=settings.agent_max_context_messages,
    )
    return {"messages": removed} if removed else {}
