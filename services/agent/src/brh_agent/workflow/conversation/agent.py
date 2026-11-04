"""Generate short conversational replies without accessing retrieval."""

from langchain_core.messages import SystemMessage

from brh_agent.lib.prompts import IDENTITY


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
    for chunk in model.stream(messages):
        if isinstance(chunk.content, str) and chunk.content:
            parts.append(chunk.content)
            on_chunk(chunk.content)
    return "".join(parts)
