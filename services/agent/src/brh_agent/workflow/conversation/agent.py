"""Generate short conversational replies without accessing retrieval."""

from langchain_core.messages import SystemMessage

from brh_agent.lib.prompts import (
    IDENTITY,
    META_POLICY,
    OUT_OF_SCOPE_POLICY,
    OUT_OF_SCOPE_REPLY,
)
from brh_agent.usage.tokens import (
    estimate_usage,
    normalize_usage,
    usage_from_message,
)

OUT_OF_SCOPE_MAX_CHARS = 500


def valid_out_of_scope_reply(text: str) -> bool:
    """Reject a model answer that smuggled in code, lists or a tutorial."""
    stripped = text.strip()
    if not stripped or len(stripped) > OUT_OF_SCOPE_MAX_CHARS or "```" in stripped:
        return False
    return not any(
        line.lstrip().startswith(("#", "-", "*", "1.", "2.", "3."))
        for line in stripped.splitlines()
    )


def respond(state, model, on_chunk):
    intent = state["intent"]
    instructions = {
        "greeting": "Répondez cordialement à la salutation et proposez votre aide.",
        "meta": META_POLICY,
        "out_of_scope": OUT_OF_SCOPE_POLICY,
        "clarification": "Posez une question courte pour clarifier la demande.",
    }
    history = state["messages"][-8:]
    if intent in {"out_of_scope", "meta"}:
        # Do not let an earlier off-topic tutorial anchor the next refusal.
        history = state["messages"][-1:]
    messages = [
        SystemMessage(content=IDENTITY + "\n" + instructions[intent]),
        *history,
    ]
    if intent == "out_of_scope":
        response = model.invoke(messages)
        text = response.text
        if not valid_out_of_scope_reply(text):
            text = OUT_OF_SCOPE_REPLY
        on_chunk(text)
        return text, usage_from_message(response, messages)
    parts = []
    usage: dict[str, int] = {}
    for chunk in model.stream(messages):
        usage = normalize_usage(getattr(chunk, "usage_metadata", None)) or usage
        if isinstance(chunk.content, str) and chunk.content:
            parts.append(chunk.content)
            on_chunk(chunk.content)
    text = "".join(parts)
    return text, usage or estimate_usage(messages, text)
