"""LangGraph entry point for the BRH documentary assistant."""

from collections.abc import Callable
from functools import partial
from typing import Any

from langgraph.graph import END, START, StateGraph

from brh_agent.lib.activity import tracked
from brh_agent.lib.llm import chat_model, decide_intent, small_model
from brh_agent.usage.node import commit_daily_usage
from brh_agent.usage.quota import DailyTokenQuota
from brh_agent.workflow.context import limit_context
from brh_agent.workflow.conversation.node import converse
from brh_agent.workflow.conversation.title import title_thread
from brh_agent.workflow.research import nodes as research_nodes
from brh_agent.workflow.research.tools import make_search_tool
from brh_agent.workflow.router.node import route
from brh_agent.workflow.state import AgentState


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
    builder.add_node("research_start", tracked(research_nodes.start))
    builder.add_node(
        "research",
        tracked(
            partial(research_nodes.think, model_factory=model_factory, search_tool=search_tool)
        ),
    )
    builder.add_node("tools", tracked(partial(research_nodes.search, search_tool=search_tool)))
    builder.add_node("final", tracked(partial(research_nodes.final, model_factory=model_factory)))
    builder.add_node("title", partial(title_thread, title_model_factory=title_model_factory))
    builder.add_node("usage_commit", partial(commit_daily_usage, quota=usage_quota))

    builder.add_edge(START, "context_guard")
    builder.add_edge("context_guard", "router")
    builder.add_conditional_edges("router", choose, ["research_start", "conversation"])
    builder.add_edge("conversation", "title")
    builder.add_edge("research_start", "research")
    builder.add_conditional_edges("research", research_nodes.next_step, ["tools", "final"])
    builder.add_edge("tools", "research")
    builder.add_edge("final", "title")
    builder.add_edge("title", "usage_commit")
    builder.add_edge("usage_commit", END)
    return builder.compile(checkpointer=checkpointer)


graph = build_graph()
