"""LangGraph entry point for the BRH documentary assistant."""

import logging
from contextvars import ContextVar
from uuid import uuid4

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.config import get_stream_writer
from langgraph.graph import END, START, StateGraph

from brh_agent.conversation.agent import respond
from brh_agent.models import chat_model, decide_intent
from brh_agent.research import agent as research
from brh_agent.research.tools import make_search_tool
from brh_agent.router.agent import route_turn
from brh_agent.state import AgentState
from brh_agent.telemetry import configure_tracing

logger = logging.getLogger(__name__)
ERROR = "Le service est temporairement indisponible. Veuillez réessayer."


def build_graph(*, decision=None, model_factory=None, search_tool=None, checkpointer=None):
    decision = decision or decide_intent
    model_factory = model_factory or chat_model
    search_tool = search_tool or make_search_tool()

    event_buffer = ContextVar("activity_buffer", default=None)

    def emit(turn_id, stage, status, **details):
        event = {
            "type": "brh.activity",
            "turn_id": turn_id,
            "id": details.pop("event_id", stage),
            "stage": stage,
            "status": status,
            **details,
        }
        get_stream_writer()(event)
        buffer = event_buffer.get()
        if buffer is not None:
            buffer.append(event)

    def tracked(node):
        def run(state):
            events = []
            token = event_buffer.set(events)
            try:
                result = node(state)
            finally:
                event_buffer.reset(token)
            turn_id = result.get("turn_id", state.get("turn_id"))
            previous = [
                event for event in state.get("activities", []) if event["turn_id"] == turn_id
            ]
            merged = {event["id"]: event for event in [*previous, *events]}
            result["activities"] = list(merged.values())
            for message in result.get("messages", []):
                if isinstance(message, AIMessage) and "brh" in message.additional_kwargs:
                    message.additional_kwargs["brh"]["activities"] = result["activities"]
            return result

        return run

    def router(state):
        turn_id = str(uuid4())
        emit(turn_id, "route_intent", "running")
        result = route_turn(state, decision)
        emit(turn_id, "route_intent", "error" if result["intent"] == "error" else "complete")
        return {**result, "turn_id": turn_id}

    def conversation(state):
        emit(state["turn_id"], "respond", "running")
        parts = []

        def on_chunk(chunk):
            parts.append(chunk)
            get_stream_writer()(
                {
                    "type": "brh.answer.delta",
                    "turn_id": state["turn_id"],
                    "text": chunk,
                }
            )

        failed = state["intent"] == "error"
        try:
            text = ERROR if failed else respond(state, model_factory(), on_chunk)
        except Exception:
            logger.exception("Conversation response failed")
            failed = True
            partial = "".join(parts).strip()
            text = (
                partial + "\n\nLa réponse a été interrompue. Veuillez réessayer."
                if partial
                else ERROR
            )
        emit(state["turn_id"], "respond", "error" if failed else "complete")
        return publish(text, [], "error" if failed else "conversation", state["turn_id"])

    def start_research(state):
        return research.start(state)

    def think(state):
        emit(state["turn_id"], "assess_coverage", "running", event_id=f"draft:{state['searches']}")
        try:
            result = research.think(state, model_factory(), search_tool)
            emit(
                state["turn_id"],
                "assess_coverage",
                "complete",
                event_id=f"draft:{state['searches']}",
            )
            return result
        except Exception:
            emit(
                state["turn_id"], "assess_coverage", "error", event_id=f"draft:{state['searches']}"
            )
            logger.exception("Research model failed")
            return {"research_messages": [*state["research_messages"], AIMessage(content=ERROR)]}

    def tools(state):
        return research.search(
            state,
            search_tool,
            lambda status, **details: emit(state["turn_id"], "search", status, **details),
        )

    def final(state):
        last = state["research_messages"][-1]
        if last.content == ERROR:
            return publish(ERROR, [], "error", state["turn_id"])
        if not state["citations"]:
            text, citations = research.answer(state)
            return publish(text, citations, "answer", state["turn_id"])
        emit(state["turn_id"], "draft", "running", event_id="final-writer")
        parts = []
        try:
            history = [
                *state["research_messages"],
                HumanMessage(
                    content=(
                        "Rédigez la réponse finale en français. "
                        "Utilisez les passages retrouvés et leurs références [1], [2]. "
                        "Gardez les raisonnements privés. Adaptez la longueur à la question."
                    )
                ),
            ]
            for sequence, chunk in enumerate(model_factory().stream(history)):
                if isinstance(chunk.content, str) and chunk.content:
                    parts.append(chunk.content)
                    get_stream_writer()(
                        {
                            "type": "brh.answer.delta",
                            "turn_id": state["turn_id"],
                            "sequence": sequence,
                            "text": chunk.content,
                        }
                    )
            emit(state["turn_id"], "draft", "complete", event_id="final-writer")
            text, citations = research.answer(
                {**state, "research_messages": [AIMessage(content="".join(parts))]}
            )
            return publish(text, citations, "answer", state["turn_id"])
        except Exception:
            logger.exception("Final writer failed")
            emit(state["turn_id"], "draft", "error", event_id="final-writer")
            partial = "".join(parts).strip()
            if partial:
                return publish(
                    partial + "\n\nLa réponse a été interrompue. Veuillez réessayer.",
                    [],
                    "error",
                    state["turn_id"],
                )
            return publish(ERROR, [], "error", state["turn_id"])

    def choose(state):
        return "research_start" if state["intent"] == "financial_query" else "conversation"

    def next_step(state):
        message = state["research_messages"][-1]
        return (
            "tools"
            if getattr(message, "tool_calls", None) and state["searches"] < research.MAX_SEARCHES
            else "final"
        )

    builder = StateGraph(AgentState)
    builder.add_node("router", tracked(router))
    builder.add_node("conversation", tracked(conversation))
    builder.add_node("research_start", tracked(start_research))
    builder.add_node("research", tracked(think))
    builder.add_node("tools", tracked(tools))
    builder.add_node("final", tracked(final))
    builder.add_edge(START, "router")
    builder.add_conditional_edges("router", choose, ["research_start", "conversation"])
    builder.add_edge("conversation", END)
    builder.add_edge("research_start", "research")
    builder.add_conditional_edges("research", next_step, ["tools", "final"])
    builder.add_edge("tools", "research")
    builder.add_edge("final", END)
    return builder.compile(checkpointer=checkpointer)


def publish(text, citations, kind, turn_id):
    envelope = {"version": 1, "validated": True, "kind": kind, "citations": citations}
    return {
        "messages": [
            AIMessage(id=f"answer-{turn_id}", content=text, additional_kwargs={"brh": envelope})
        ],
        "answer": text,
        "citations": citations,
        "grounded": bool(citations),
        "kind": kind,
    }


configure_tracing()
graph = build_graph()
