"""Bounded adaptive LangGraph workflow (ADR-0017)."""

from typing import Any

from langgraph.graph import END, START, StateGraph

from brh_agent import answering, nodes, planning, research
from brh_agent.observability import setup_observability
from brh_agent.resources import get_resources
from brh_agent.state import AgentState

setup_observability()


def build_graph(*, checkpointer: Any | None = None, resources=None) -> Any:
    resource_provider = (lambda: resources) if resources is not None else get_resources
    builder = StateGraph(AgentState)

    def guard(fn, **kwargs):
        return nodes.guarded(fn, resource_provider, **kwargs)

    def validate_plan(state, res):
        if not state.get("plan"):
            return {"plan_status": "invalid"}
        return planning.validate_plan(state, res)

    def after_prepare(state):
        if state.get("duplicate"):
            return END
        return "publish" if state["kind"] else "route_intent"

    def after_route(state):
        if state.get("kind"):
            return "publish"
        return "plan" if state["route"] == "plan" else "respond"

    def after_plan(state):
        if state.get("kind"):
            return "publish"
        if state["plan_status"] == "clarify":
            return "respond"
        if state["plan_status"] != "valid":
            return "plan" if not state["plan_repairs"] else "respond"
        return {
            "conversation": "respond",
            "clarify": "respond",
            "out_of_scope": "respond",
        }.get(state["plan"]["mode"], "schedule")

    def after_coverage(state):
        if state.get("kind"):
            return "publish"
        if state["next_action"] == "refine" and not state["refinement_count"]:
            return "refine"
        if state["next_action"] == "respond" or state["support"] == "insufficient":
            return "respond"
        return "draft"

    def after_validation(state):
        if state.get("kind"):
            return "publish"
        if not state["issues"]:
            return "publish"
        return "draft" if not state["answer_repairs"] else "respond"

    builder.add_node("prepare", nodes.prepare_turn)
    for name, fn, stage in [
        ("route_intent", planning.route_intent, ""),
        ("respond", nodes.respond, "response"),
        ("plan", planning.make_plan, "plan"),
        ("validate_plan", validate_plan, "plan"),
        ("assess_coverage", research.assess, ""),
        ("refine", research.refine, "refine"),
        ("draft", answering.draft_answer, "draft"),
        ("validate_answer", answering.validate_answer, "draft"),
    ]:
        builder.add_node(
            name,
            guard(
                fn,
                schema_stage=stage,
                call_cost=2 if name in {"refine", "respond"} else 1,
                activity_name=name,
            ),
        )
    builder.add_node("schedule", research.schedule)
    builder.add_node("search_goal", lambda work: research.search_goal(work, resource_provider()))
    builder.add_node("publish", nodes.publish)
    builder.add_edge(START, "prepare")
    builder.add_conditional_edges("prepare", after_prepare, ["publish", "route_intent", END])
    builder.add_conditional_edges("route_intent", after_route, ["publish", "respond", "plan"])
    builder.add_edge("respond", "publish")
    builder.add_edge("plan", "validate_plan")
    builder.add_conditional_edges(
        "validate_plan",
        after_plan,
        [
            "publish",
            "respond",
            "plan",
            "schedule",
        ],
    )
    builder.add_conditional_edges("schedule", research.dispatch, ["search_goal", "assess_coverage"])
    builder.add_edge("search_goal", "schedule")
    builder.add_conditional_edges(
        "assess_coverage",
        after_coverage,
        ["publish", "refine", "draft", "respond"],
    )
    builder.add_conditional_edges(
        "refine", lambda s: "publish" if s.get("kind") else "schedule", ["publish", "schedule"]
    )
    builder.add_edge("draft", "validate_answer")
    builder.add_conditional_edges(
        "validate_answer", after_validation, ["publish", "draft", "respond"]
    )
    builder.add_edge("publish", END)
    return builder.compile(checkpointer=checkpointer).with_config(recursion_limit=80)


graph = build_graph()
