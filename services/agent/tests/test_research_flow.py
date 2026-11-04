"""Offline research, retrieval and citation publication checks."""

import json

from brh_agent.workflow.research.agent import answer
from brh_agent.workflow.research.tools import make_search_tool
from helpers import Model, Service, build_graph
from langchain_core.messages import AIMessage, HumanMessage


def test_tool_forwards_exact_filters_and_canonical_citations():
    service = Service()
    tool = make_search_tool(service)
    result = json.loads(tool.invoke({"query": "taux", "document_id": "d", "page_number": 3}))
    assert service.calls == [
        ("taux", {"top_k": 6, "filter": {"document_id": "d", "page_number": 3}})
    ]
    assert result["citations"][0]["title"] == "Note BRH"
    assert result["passages"][0]["page_number"] == 3


def test_research_calls_tool_and_publishes_source():
    service = Service()
    model = Model(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {
                        "name": "rechercher_documents_brh",
                        "args": {"query": "taux directeur"},
                        "id": "one",
                    }
                ],
            ),
            AIMessage(content="Le taux est de 5 % [1]."),
            AIMessage(content="Le taux est de 5 % [1]."),
        ]
    )
    graph = build_graph(
        decision=lambda _: "financial_query",
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
    )
    result = graph.invoke({"messages": [HumanMessage(content="Quel est le taux ?")]})
    assert len(service.calls) == 1
    assert result["answer"] == "Le taux est de 5 % [1]."
    assert result["citations"][0]["page_number"] == 3
    assert result["messages"][-1].additional_kwargs["brh"]["citations"] == result["citations"]


def test_invalid_citation_marker_keeps_answer_without_citations():
    service = Service()
    model = Model(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "rechercher_documents_brh", "args": {"query": "taux"}, "id": "one"}
                ],
            ),
            AIMessage(content="Le taux est de 5 % [2]."),
            AIMessage(content="Le taux est de 5 % [2]."),
        ]
    )
    graph = build_graph(
        decision=lambda _: "financial_query",
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
    )
    result = graph.invoke({"messages": [HumanMessage(content="Quel est le taux ?")]})
    assert result["answer"] == "Le taux est de 5 % [2]."
    assert result["citations"] == []
    assert result["grounded"] is False


def test_research_writer_streams_before_final_publication():
    service = Service()
    model = Model(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "rechercher_documents_brh", "args": {"query": "taux"}, "id": "one"}
                ],
            ),
            AIMessage(content="Brouillon privé [1]."),
            AIMessage(content="Le taux est de 5 % [1]."),
        ]
    )
    graph = build_graph(
        decision=lambda _: "financial_query",
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
    )
    events = list(
        graph.stream(
            {"messages": [HumanMessage(content="Quel taux ?")]}, stream_mode=["custom", "values"]
        )
    )
    deltas = [
        (i, event)
        for i, (mode, event) in enumerate(events)
        if mode == "custom" and event["type"] == "brh.answer.delta"
    ]
    assert deltas
    final_index = next(
        i for i, (mode, event) in enumerate(events) if mode == "values" and event.get("answer")
    )
    assert deltas[0][0] < final_index
    final = events[final_index][1]
    assert final["messages"][-1].id == f"answer-{deltas[0][1]['turn_id']}"
    assert "Brouillon" not in "".join(event["text"] for _, event in deltas)


def test_streamed_limitations_are_not_replaced_when_sources_exist():
    service = Service()
    limitation = "Les documents consultés ne permettent pas de répondre à cette question."
    model = Model(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "rechercher_documents_brh", "args": {"query": "taux"}, "id": "one"}
                ],
            ),
            AIMessage(content="Les sources sont insuffisantes."),
            AIMessage(content=limitation),
        ]
    )
    graph = build_graph(
        decision=lambda _: "financial_query",
        model_factory=lambda: model,
        search_tool=make_search_tool(service),
    )
    events = list(
        graph.stream(
            {"messages": [HumanMessage(content="Quel taux ?")]}, stream_mode=["custom", "values"]
        )
    )
    streamed = "".join(
        event["text"]
        for mode, event in events
        if mode == "custom" and event.get("type") == "brh.answer.delta"
    )
    final = next(
        event for mode, event in reversed(events) if mode == "values" and event.get("answer")
    )
    assert streamed == final["answer"] == limitation
    assert final["citations"] == []
    assert final["grounded"] is False


def test_no_sources_preserves_model_explanation():
    text = "La recherche n'a pas permis de trouver des documents pertinents."
    assert answer({"research_messages": [AIMessage(content=text)], "citations": []}) == (text, [])


def test_partial_research_response_is_preserved_after_stream_error():
    class InterruptedModel(Model):
        def stream(self, messages):
            yield AIMessage(content="Les documents indiquent une évolution")
            raise RuntimeError("interrupted")

    model = InterruptedModel(
        [
            AIMessage(
                content="",
                tool_calls=[
                    {"name": "rechercher_documents_brh", "args": {"query": "taux"}, "id": "one"}
                ],
            ),
            AIMessage(content="Brouillon [1]."),
        ]
    )
    graph = build_graph(
        decision=lambda _: "financial_query",
        model_factory=lambda: model,
        search_tool=make_search_tool(Service()),
    )
    result = graph.invoke({"messages": [HumanMessage(content="Quel taux ?")]})
    assert result["answer"].startswith("Les documents indiquent une évolution")
    assert "interrompue" in result["answer"]
    assert result["citations"] == []
    assert result["kind"] == "error"
