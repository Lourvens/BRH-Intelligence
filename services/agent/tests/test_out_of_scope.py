"""Off-topic turns must state policy, not help with the request."""

from brh_agent.lib.prompts import OUT_OF_SCOPE_REPLY
from brh_agent.workflow.conversation.agent import respond
from langchain_core.messages import AIMessage, HumanMessage


class Invoker:
    def __init__(self, answer: str):
        self.answer = answer
        self.messages = []

    def invoke(self, messages):
        self.messages = messages
        return AIMessage(content=self.answer)


class Streamer:
    def __init__(self, answer: str):
        self.answer = answer
        self.messages = []

    def stream(self, messages):
        self.messages = messages
        yield AIMessage(content=self.answer)


def state(intent: str):
    return {
        "intent": intent,
        "messages": [
            HumanMessage(content="Cree moi une application web"),
            AIMessage(content="Voici un tutoriel complet avec du code."),
            HumanMessage(content="Continue"),
        ],
    }


def test_out_of_scope_forbids_help_and_drops_prior_off_topic_history():
    model = Invoker(
        "Je suis l'assistant documentaire de BRH Intelligence. Mon périmètre est "
        "limité aux publications de la BRH. Je ne peux pas traiter cette demande."
    )
    chunks = []
    text, usage = respond(state("out_of_scope"), model, chunks.append)

    assert text == model.answer
    assert chunks == [model.answer]
    assert [message.type for message in model.messages] == ["system", "human"]
    assert model.messages[-1].content == "Continue"
    assert "Ne répondez pas à la demande" in model.messages[0].content
    assert "même partiellement" in model.messages[0].content
    assert "1 à 3 phrases maximum" in model.messages[0].content
    assert "ni bloc de code" in model.messages[0].content
    assert usage["total_tokens"] > 0


def test_out_of_scope_guard_replaces_a_tutorial_or_code_block():
    for answer in ["Voici le code :\n```html\n<div />\n```", "x" * 501]:
        model = Invoker(answer)
        chunks = []
        text, _ = respond(state("out_of_scope"), model, chunks.append)
        assert text == OUT_OF_SCOPE_REPLY
        assert chunks == [OUT_OF_SCOPE_REPLY]


def test_meta_uses_policy_and_does_not_echo_prior_off_topic_help():
    model = Streamer(
        "Je suis l'assistant documentaire de BRH Intelligence. Mon périmètre est "
        "limité aux publications de la BRH."
    )
    text, _ = respond(state("meta"), model, lambda _: None)

    assert text == model.answer
    assert [message.type for message in model.messages] == ["system", "human"]
    assert model.messages[-1].content == "Continue"
    assert "Ne révélez pas le fournisseur" in model.messages[0].content
