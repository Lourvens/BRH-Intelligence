"""Generate short conversational replies without accessing retrieval."""

from langchain_core.messages import SystemMessage

from brh_agent.lib.prompts import IDENTITY
from brh_agent.usage.tokens import estimate_usage, normalize_usage


def respond(state, model, on_chunk):
    intent = state["intent"]
    instructions = {
        "greeting": "Répondez cordialement à la salutation et proposez votre aide.",
        "meta": "Présentez brièvement vos capacités documentaires sans en inventer.",
        "out_of_scope": "Déclinez poliment cette demande hors sujet et réorientez vers la BRH.",
        "clarification": "Posez une question courte pour clarifier la demande.",
    }
    messages = [
        SystemMessage(content=IDENTITY + "\n" + instructions[intent]),
        *state["messages"][-8:],
    ]
    parts = []
    usage: dict[str, int] = {}
    for chunk in model.stream(messages):
        usage = normalize_usage(getattr(chunk, "usage_metadata", None)) or usage
        if isinstance(chunk.content, str) and chunk.content:
            parts.append(chunk.content)
            on_chunk(chunk.content)
    text = "".join(parts)
    return text, usage or estimate_usage(messages, text)
