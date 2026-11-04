"""Offline routing and activity-retention checks."""

from langchain_core.messages import AIMessage, HumanMessage

from support import Model, Service, build_graph
from workflow.research.tool import make_search_tool


def test_decision_failure_never_retrieves():
    service = Service()

    def broken(_):
        raise ValueError("invalid")

    graph = build_graph(decision=broken, search_tool=make_search_tool(service))
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})
    assert "indisponible" in result["answer"]
    assert not service.calls


def test_published_answer_retains_completed_activity():
    model = Model([AIMessage(content="Bonjour !")])
    graph = build_graph(decision=lambda _: "greeting", model_factory=lambda: model)
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})
    events = result["messages"][-1].additional_kwargs["brh"]["activities"]
    assert [event["stage"] for event in events] == ["route_intent", "respond"]
    assert all(event["status"] == "complete" for event in events)
