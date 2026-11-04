"""Conversation history and ephemeral state for one agent turn."""

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    activities: list[dict[str, Any]]
    title: str
    intent: str
    turn_id: str
    research_messages: list[BaseMessage]
    passage_count: int
    search_failed: bool
    searches: int
    citations: list[dict[str, Any]]
    answer: str
    grounded: bool
    kind: str
