"""Graph nodes.

``retrieve`` -> ``generate`` or ``refuse``, decided by whether any retrieved
chunk cleared the score threshold (ADR-0002, ADR-0006). The retrieval service
and the chat model are built lazily so importing the graph performs no network
I/O — important for the LangGraph server, tests, and tooling.

TODO: implement each node. Keep the names and signatures — ``graph.py`` wires
them.
"""

from __future__ import annotations

from typing import Any

from brh_agent.state import AgentState


def get_retrieval_service() -> Any:
    """Process-wide retrieval service (the shared core).

    Build it once via ``brh_core.retrieval.build_retrieval_service`` and cache
    it. Returns a ``RetrievalService``.
    """
    raise NotImplementedError("TODO: lazily build + cache the retrieval service")


def retrieve_node(state: AgentState) -> dict[str, Any]:
    """Read the question, search the corpus, and record the evidence.

    Return updates for ``question``, ``grounded``, ``retrieved`` (dumped
    chunks), and ``citations`` (dumped citations).
    """
    raise NotImplementedError("TODO: call RetrievalService.search and write state")


def generate_node(state: AgentState) -> dict[str, Any]:
    """Ask the model to answer from the retrieved extracts.

    Return ``{"messages": [ai_message], "answer": text}``. Build the messages
    from ``SYSTEM_PROMPT`` + prior history (excluding the current question) +
    a single grounded human turn from ``build_user_prompt``.
    """
    raise NotImplementedError("TODO: build messages, call the model, return the answer")


def refuse_node(state: AgentState) -> dict[str, Any]:
    """Return the refusal message when no evidence cleared the threshold."""
    raise NotImplementedError("TODO: return the refusal as an AIMessage + answer")


def route_after_retrieve(state: AgentState) -> str:
    """``"generate"`` when grounded, otherwise ``"refuse"``."""
    raise NotImplementedError("TODO: branch on state['grounded']")
