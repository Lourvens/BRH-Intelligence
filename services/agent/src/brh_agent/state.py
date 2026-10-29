"""Persistent conversation and resettable, bounded per-turn workflow state."""

from __future__ import annotations

from typing import Annotated, Any, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


def merge_results(left: dict, right: dict) -> dict:
    """Idempotent fan-in; each logical search owns one stable key."""
    return {**left, **right}


class AgentState(TypedDict, total=False):
    messages: Annotated[list[BaseMessage], add_messages]
    question: str
    grounded: bool
    retrieved: list[dict[str, Any]]
    citations: list[dict[str, Any]]
    answer: str
    turn_id: str
    deadline: float
    phase: str
    kind: str
    route: str
    model_calls: int
    plan: dict[str, Any]
    plan_status: str
    plan_repairs: int
    results: Annotated[dict[str, Any], merge_results]
    pending: list[dict[str, Any]]
    evidence: dict[str, Any]
    coverage: dict[str, str]
    support: str
    refinement_count: int
    next_action: str
    draft: dict[str, Any]
    issues: list[str]
    answer_repairs: int
    duplicate: bool
