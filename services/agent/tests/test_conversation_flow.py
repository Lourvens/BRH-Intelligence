"""Offline conversation, streaming and partial-failure checks."""

from brh_agent.workflow.research.tools import make_search_tool
from helpers import Model, Service, build_graph
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver


def test_conversation_never_uses_search_and_keeps_thread_context():
    service = Service()
    model = Model([AIMessage(content="Bonjour !"), AIMessage(content="Je peux vous aider.")])
    observed = []

    def decide(history):
        observed.append(history)
        return "greeting"

    graph = build_graph(
        decision=decide,
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
        checkpointer=InMemorySaver(),
    )
    config = {"configurable": {"thread_id": "one"}}
    graph.invoke({"messages": [HumanMessage(content="Bonjour")]}, config)
    result = graph.invoke({"messages": [HumanMessage(content="Merci")]}, config)
    assert len(observed[-1]) == 3
    assert result["messages"][-1].additional_kwargs["brh"]["validated"] is True
    assert service.calls == []


def test_stream_reports_only_actual_conversation_work():
    service = Service()
    model = Model([AIMessage(content="Bonjour !")])
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
    )
    events = list(
        graph.stream({"messages": [HumanMessage(content="Bonjour")]}, stream_mode="custom")
    )
    activity = [event for event in events if event["type"] == "brh.activity"]
    assert {event["stage"] for event in activity} == {"route_intent", "respond"}
    assert {event["status"] for event in activity} == {"running", "complete"}
    assert [event["text"] for event in events if event["type"] == "brh.answer.delta"] == [
        "Bonjour !"
    ]
    assert not service.calls


def test_partial_conversation_is_preserved_after_stream_error():
    class InterruptedModel(Model):
        def stream(self, messages):
            yield AIMessage(content="Bonjour, je peux vous aider")
            raise RuntimeError("interrupted")

    graph = build_graph(decision=lambda _: "greeting", model_factory=lambda: InterruptedModel([]))
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})
    assert result["answer"].startswith("Bonjour, je peux vous aider")
    assert "interrompue" in result["answer"]
    assert result["kind"] == "error"
