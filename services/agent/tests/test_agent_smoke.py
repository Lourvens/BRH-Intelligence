"""Smoke test — the graph compiles.

Passes today: the graph wiring is real, the nodes are stubs. Replace with
behavioural tests as you implement the nodes.
"""

from brh_agent.graph import build_graph, graph


def test_graph_compiles():
    assert graph is not None
    nodes = set(graph.get_graph().nodes)
    assert {"retrieve", "generate", "refuse"} <= nodes


def test_build_graph_is_parameterised():
    assert build_graph() is not None
