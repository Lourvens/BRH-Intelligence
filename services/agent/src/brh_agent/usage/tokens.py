"""Normalize provider usage metadata and estimate it when absent."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from langchain_core.messages import AIMessage, BaseMessage
from langchain_core.messages.utils import count_tokens_approximately

_TOKEN_KEYS = ("input_tokens", "output_tokens", "total_tokens")


def normalize_usage(usage: Mapping[str, Any] | None) -> dict[str, int]:
    if not usage:
        return {}
    input_tokens = max(0, int(usage.get("input_tokens") or 0))
    output_tokens = max(0, int(usage.get("output_tokens") or 0))
    total_tokens = max(
        input_tokens + output_tokens, int(usage.get("total_tokens") or 0)
    )
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": total_tokens,
    }


def add_usage(
    current: Mapping[str, int] | None, extra: Mapping[str, int] | None
) -> dict[str, int]:
    left = normalize_usage(current)
    right = normalize_usage(extra)
    if not right:
        return left
    if not left:
        return right
    return {key: left.get(key, 0) + right.get(key, 0) for key in _TOKEN_KEYS}


def total_tokens(usage: Mapping[str, int] | None) -> int:
    return normalize_usage(usage).get("total_tokens", 0)


def estimate_usage(
    messages: Sequence[BaseMessage], output: str = ""
) -> dict[str, int]:
    """Offline fallback for providers that do not return usage metadata."""
    input_tokens = count_tokens_approximately(list(messages))
    output_tokens = (
        count_tokens_approximately([AIMessage(content=output)]) if output else 0
    )
    return {
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "total_tokens": input_tokens + output_tokens,
    }


def usage_from_message(
    message: AIMessage, prompt: Sequence[BaseMessage] = ()
) -> dict[str, int]:
    usage = normalize_usage(getattr(message, "usage_metadata", None))
    if usage:
        return usage
    content = message.content if isinstance(message.content, str) else str(message.content)
    return estimate_usage(prompt, content)
