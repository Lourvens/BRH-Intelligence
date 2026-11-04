"""Offline conversation-title generation and normalization checks."""

from brh_agent.workflow.conversation.title import normalize_title
from helpers import Model, build_graph
from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver


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
    assert "60 caractères maximum" in prompt[-1].text
    assert "3 à 8 mots" in prompt[-1].text
    assert "conservez les sigles" in prompt[-1].text
    assert configs[0]["run_name"] == "thread-title"


def test_normalize_title_strips_wrapping_prefix_and_punctuation():
    assert normalize_title("**Titre : « Taux directeur ».**") == "Taux directeur"
    assert normalize_title("Titre : Taux directeur.") == "Taux directeur"
    assert normalize_title("12345") == ""


def test_normalize_title_caps_the_sidebar_title_length():
    title = normalize_title("mot " * 30)
    assert len(title) <= 60
    assert title == "mot " * 14 + "mot"


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
