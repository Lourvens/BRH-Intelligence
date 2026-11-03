"""Offline behavior checks for the new agent and its retrieval tool."""

import json

from brh_agent.graph import _normalize_title
from brh_agent.graph import build_graph as create_graph
from brh_agent.research.tools import make_search_tool
from brh_core.models import Citation, RetrievedChunk, SearchResult
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver


class TitleModel:
    def invoke(self, messages, config=None):
        return AIMessage(content="Politique monétaire")


def build_graph(**kwargs):
    kwargs.setdefault("title_model_factory", TitleModel)
    return create_graph(**kwargs)


class Service:
    def __init__(self):
        self.calls = []

    def search(self, query, **kwargs):
        self.calls.append((query, kwargs))
        return SearchResult(
            question=query,
            chunks=(
                RetrievedChunk(
                    chunk_id="c", document_id="d", page_number=3, text="Taux de 5 %", score=0.9
                ),
            ),
            citations=(
                Citation(
                    document_id="d",
                    slug="note",
                    title="Note BRH",
                    page_number=3,
                    snippet="Taux de 5 %",
                    score=0.9,
                    pdf_url="/note.pdf",
                ),
            ),
            grounded=True,
        )


class Model:
    def __init__(self, responses):
        self.responses = iter(responses)

    def bind_tools(self, tools):
        return self

    def invoke(self, messages):
        return next(self.responses)

    def stream(self, messages):
        yield next(self.responses)


def test_tool_forwards_exact_filters_and_canonical_citations():
    service = Service()
    tool = make_search_tool(service)
    result = json.loads(tool.invoke({"query": "taux", "document_id": "d", "page_number": 3}))
    assert service.calls == [
        ("taux", {"top_k": 6, "filter": {"document_id": "d", "page_number": 3}})
    ]
    assert result["citations"][0]["title"] == "Note BRH"
    assert result["passages"][0]["page_number"] == 3


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


def test_decision_failure_never_retrieves():
    service = Service()

    def broken(_):
        raise ValueError("invalid")

    graph = build_graph(decision=broken, search_tool=make_search_tool(service))
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})
    assert "indisponible" in result["answer"]
    assert not service.calls


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


def test_published_answer_retains_completed_activity():
    model = Model([AIMessage(content="Bonjour !")])
    graph = build_graph(decision=lambda _: "greeting", model_factory=lambda: model)
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})
    events = result["messages"][-1].additional_kwargs["brh"]["activities"]
    assert [event["stage"] for event in events] == ["route_intent", "respond"]
    assert all(event["status"] == "complete" for event in events)


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
    from brh_agent.research.agent import answer

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


def test_title_generated_once_and_restored_with_thread():
    calls = []

    class Counter:
        def invoke(self, messages, config=None):
            calls.append(messages)
            return AIMessage(content="  « Taux directeur »  ")

    model = Model([AIMessage(content="Bonjour"), AIMessage(content="Autre réponse")])
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: model,
        title_model_factory=Counter,
        checkpointer=InMemorySaver(),
    )
    config = {"configurable": {"thread_id": "title-thread"}}
    first = graph.invoke({"messages": [HumanMessage(content="Quel taux ?")]}, config)
    second = graph.invoke({"messages": [HumanMessage(content="Merci")]}, config)
    assert first["title"] == second["title"] == "Taux directeur"
    assert len(calls) == 1


def test_title_prompt_uses_both_roles_and_ends_on_a_user_turn():
    prompts = []
    configs = []

    class Recorder:
        def invoke(self, messages, config=None):
            prompts.append(messages)
            configs.append(config)
            return AIMessage(content="**Titre : « Taux directeur ».**")

    model = Model([AIMessage(content="Bonjour ! Je peux vous aider.")])
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: model,
        title_model_factory=Recorder,
    )
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]})

    assert result["title"] == "Taux directeur"
    prompt = prompts[0]
    # Both sides of the exchange are real messages, and the prompt closes on a
    # user instruction: ending on the assistant answer makes the model continue
    # it instead of titling, which surfaced the reply prefix as the title.
    assert [message.type for message in prompt] == ["system", "human", "ai", "human"]
    assert "générateur de titres" in prompt[0].text
    assert prompt[1].text == "Bonjour"
    assert prompt[2].text == "Bonjour ! Je peux vous aider."
    assert "255 caractères" in prompt[-1].text
    assert "conservez les sigles" in prompt[-1].text
    assert configs[0]["run_name"] == "thread-title"


def test_normalize_title_strips_wrapping_prefix_and_punctuation():
    assert _normalize_title("**Titre : « Taux directeur ».**") == "Taux directeur"
    assert _normalize_title("Titre : Taux directeur.") == "Taux directeur"
    assert _normalize_title("12345") == ""


def test_title_failure_does_not_replace_response():
    class Broken:
        def invoke(self, messages, config=None):
            raise RuntimeError("unavailable")

    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: Model([AIMessage(content="Bonjour !")]),
        title_model_factory=Broken,
    )
    result = graph.invoke({"messages": [HumanMessage(content="Salut")]})
    assert result["answer"] == "Bonjour !"
    assert not result.get("title")
