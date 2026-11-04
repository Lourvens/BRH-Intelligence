"""LangGraph entry point for the BRH documentary assistant."""

from collections.abc import Callable
from functools import partial
from typing import Any

from langgraph.graph import END, START, StateGraph

from llm import chat_model, decide_intent, small_model
from usage.quota import DailyTokenQuota
from workflow.activity import tracked
from workflow.context import limit_context
from workflow.conversation.node import converse
from workflow.conversation.title import title_thread
from workflow.research import node as research_node
from workflow.research.tool import make_search_tool
from workflow.router.node import route
from workflow.settle_usage import commit_daily_usage
from workflow.state import AgentState


def choose(state: dict[str, Any]) -> str:
    return "research_start" if state["intent"] == "financial_query" else "conversation"


def build_graph(
    *,
    decision: Callable[[list[dict[str, str]]], str] | None = None,
    model_factory: Callable[[], Any] | None = None,
    search_tool: Any = None,
    checkpointer: Any = None,
    title_model_factory: Callable[[], Any] | None = None,
    usage_quota: DailyTokenQuota | None = None,
) -> Any:
    decision = decision or decide_intent
    model_factory = model_factory or chat_model
    search_tool = search_tool or make_search_tool()
    title_model_factory = title_model_factory or small_model

    builder = StateGraph(AgentState)
    builder.add_node("context_guard", limit_context)
    builder.add_node("router", tracked(partial(route, decision=decision)))
    builder.add_node("conversation", tracked(partial(converse, model_factory=model_factory)))
    builder.add_node("research_start", tracked(research_node.start))
    builder.add_node(
        "research",
        tracked(
            partial(research_node.think, model_factory=model_factory, search_tool=search_tool)
        ),
    )
    builder.add_node("tools", tracked(partial(research_node.search, search_tool=search_tool)))
    builder.add_node("final", tracked(partial(research_node.final, model_factory=model_factory)))
    builder.add_node("title", partial(title_thread, title_model_factory=title_model_factory))
    builder.add_node("usage_commit", partial(commit_daily_usage, quota=usage_quota))

    builder.add_edge(START, "context_guard")
    builder.add_edge("context_guard", "router")
    builder.add_conditional_edges("router", choose, ["research_start", "conversation"])
    builder.add_edge("conversation", "title")
    builder.add_edge("research_start", "research")
    builder.add_conditional_edges("research", research_node.next_step, ["tools", "final"])
    builder.add_edge("tools", "research")
    builder.add_edge("final", "title")
    builder.add_edge("title", "usage_commit")
    builder.add_edge("usage_commit", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
