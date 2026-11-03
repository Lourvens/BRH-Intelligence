"""Validated answer envelopes and failure copy for published responses."""

from typing import Any

from langchain_core.messages import AIMessage

ERROR = "Le service est temporairement indisponible. Veuillez réessayer."
INTERRUPTED = "\n\nLa réponse a été interrompue. Veuillez réessayer."


def publish(
    text: str,
    citations: list[dict[str, Any]],
    kind: str,
    turn_id: str,
) -> dict[str, Any]:
    """Publish a validated answer with its citations into the conversation state."""
    envelope = {"version": 1, "validated": True, "kind": kind, "citations": citations}
    return {
        "messages": [
            AIMessage(id=f"answer-{turn_id}", content=text, additional_kwargs={"brh": envelope})
        ],
        "answer": text,
        "citations": citations,
        "grounded": bool(citations),
        "kind": kind,
    }


def interrupted_or_error(parts: list[str]) -> str:
    """Keep a streamed partial answer, or fall back to the outage message."""
    partial = "".join(parts).strip()
    return partial + INTERRUPTED if partial else ERROR
