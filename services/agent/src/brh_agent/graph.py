"""The compiled graph (ADR-0002).

Exposed to the LangGraph server via ``langgraph.json`` and to the web app via
the LangGraph SDK. ``build_graph`` is parameterised so tests can inject a
checkpointer; ``graph`` is the default instance the server loads.
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, START, StateGraph

from brh_agent.nodes import (
    generate_node,
    refuse_node,
    retrieve_node,
    route_after_retrieve,
)
from brh_agent.state import AgentState


def build_graph(*, checkpointer: Any | None = None) -> Any:
    """Compose retrieve → (generate | refuse) → END."""
    builder = StateGraph(AgentState)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("generate", generate_node)
    builder.add_node("refuse", refuse_node)

    builder.add_edge(START, "retrieve")
    builder.add_conditional_edges(
        "retrieve",
        route_after_retrieve,
        {"generate": "generate", "refuse": "refuse"},
    )
    builder.add_edge("generate", END)
    builder.add_edge("refuse", END)

    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
