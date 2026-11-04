"""Thread context is trimmed by message count and token budget."""

from brh_agent.workflow.context import trim_context
from helpers import Model, build_graph
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver


def test_context_trim_removes_old_messages_by_count():
    messages = [
        HumanMessage(content="one", id="h1"),
        AIMessage(content="two", id="a1"),
        HumanMessage(content="three", id="h2"),
    ]
    removed = trim_context(messages, max_tokens=1000, max_messages=2)
    assert {message.id for message in removed} == {"h1", "a1"}


def test_context_trim_keeps_the_latest_user_message():
    messages = [
        HumanMessage(content="one", id="h1"),
        AIMessage(content="two", id="a1"),
        HumanMessage(content="three", id="h2"),
    ]
    removed = trim_context(messages, max_tokens=1, max_messages=10)
    assert "h2" not in {message.id for message in removed}


def test_graph_applies_the_context_budget_to_thread_state():
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: Model([AIMessage(content="Bonjour")]),
        checkpointer=InMemorySaver(),
    )
    messages = [HumanMessage(content=f"message {i}", id=f"m{i}") for i in range(45)]
    result = graph.invoke(
        {"messages": messages},
        {"configurable": {"thread_id": "context-budget"}},
    )
    assert len(result["messages"]) == 41
    assert result["messages"][-1].content == "Bonjour"
