"""Graph state.

``messages`` carries the conversation (LangGraph's ``add_messages`` reducer
appends and de-duplicates by id). ``retrieved``/``citations``/``grounded`` are
produced by the retrieve node and read by the generate/refuse nodes and by the
UI (which reads ``stream.values``).
"""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    question: str
    grounded: bool
    retrieved: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    answer: str
