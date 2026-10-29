"""Bounded model context derived from thread-owned conversation checkpoints."""

from langchain_core.messages import AIMessage, HumanMessage, trim_messages
from langchain_core.messages.utils import count_tokens_approximately


def history(state):
    recent = [
        message.model_copy(update={"content": str(message.content)[:2500]})
        for message in state.get("messages", [])[:-1]
        if isinstance(message, (HumanMessage, AIMessage))
    ][-6:]
    trimmed = trim_messages(
        recent,
        max_tokens=4000,
        token_counter=count_tokens_approximately,
        strategy="last",
        start_on="human",
        end_on="ai",
        allow_partial=False,
    )
    return [{"role": message.type, "content": message.content} for message in trimmed]
