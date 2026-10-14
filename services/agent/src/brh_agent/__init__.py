"""BRH Intelligence agent — a LangGraph graph (ADR-0002).

The graph answers a French question from the BRH corpus, cites the source
pages, and refuses when the documents do not support an answer.
"""

from brh_agent.graph import build_graph

__all__ = ["build_graph"]
