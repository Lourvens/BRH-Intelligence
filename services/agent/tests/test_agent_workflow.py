"""Behavioral tests run the complete graph with offline providers and corpus."""

import asyncio
from threading import Event
from types import SimpleNamespace

import pytest
from brh_agent.contracts import AnswerDraft, TaskPlan
from brh_agent.graph import build_graph
from brh_agent.llm import ModelUnavailable
from brh_agent.state import merge_results
from brh_core.models import Citation, RetrievedChunk, SearchResult
from langgraph.checkpoint.memory import InMemorySaver
from pydantic import ValidationError


def goal(name="g1", query="inflation", dependencies=()):
    return {
        "goal_id": name,
        "objective": query,
        "queries": [query],
        "dependencies": list(dependencies),
    }


def plan(goals=None, **updates):
    goals = goals if goals is not None else [goal()]
    return {
        "standalone_question": "Inflation BRH",
        "intent": "factual_lookup",
        "mode": "direct" if len(goals) == 1 else "decomposed",
        "constraints": [],
        "clarification": "",
        "goals": goals,
        **updates,
    }


def hit(query):
    chunk = RetrievedChunk(
        chunk_id=query, document_id="d1", page_number=3, text="L'inflation atteint 10 %.", score=0.9
    )
    citation = Citation(
        document_id="d1",
        slug="inflation",
        title="Note BRH",
        page_number=3,
        snippet=chunk.text,
        score=0.9,
        pdf_url="https://brh.ht/note.pdf#page=3",
    )
    return SearchResult(question=query, grounded=True, chunks=(chunk,), citations=(citation,))


class FakeChat:
    def __init__(self, task_plan=None, *, bad_draft=False, invalid_plan=False):
        self.plan = task_plan or plan()
        self.calls = []
        self.bad_draft = bad_draft
        self.invalid_plan = invalid_plan

    def call(self, task, prompt, payload, schema=None):
        self.calls.append((task, payload))
        if task == "respond":
            return payload.get("clarification") or "Natural BRH assistant reply"
        if task == "plan":
            return TaskPlan.model_validate({} if self.invalid_plan else self.plan)
        if task == "refine":
            return schema.model_validate(
                {
                    "goals": [
                        {**g, "queries": [g["queries"][0] + " refined"]} for g in payload["goals"]
                    ]
                }
            )
        return AnswerDraft.model_validate(
            {
                "paragraphs": [
                    {
                        "text": "L'inflation atteint 10 %.",
                        "evidence_ids": [
                            "invented" if self.bad_draft else next(iter(payload["evidence"]))
                        ],
                    }
                ]
            }
        )


class FakeDecisions:
    def __init__(self, *, missing=(), unsupported=False):
        self.calls = []
        self.missing = set(missing)
        self.unsupported = unsupported

    def choose(self, state, questions):
        self.calls.append((state, questions))
        if "route" in questions:
            social = {"hi", "what's up?", "salut !", "merci", "bye"}
            return {"route": "conversation" if state["question"].casefold() in social else "plan"}
        if "plan" in questions:
            return {"plan": "valid"}
        if "response" in questions:
            return {"response": "valid"}
        if "next_action" in questions:
            goals = state["goals"]
            missing = not state["evidence"] or any(g["goal_id"] in self.missing for g in goals)
            return {
                **{
                    g["goal_id"]: "missing"
                    if missing and (not state["evidence"] or g["goal_id"] in self.missing)
                    else "supported"
                    for g in goals
                },
                "next_action": "refine" if missing and not state["refinement_count"] else "draft",
            }
        if all(key.startswith("query_") for key in questions):
            return {key: "valid" for key in questions}
        return {
            key: "unsupported"
            if self.unsupported and key.startswith("p")
            else ("missing" if key in self.missing else "supported")
            for key in questions
        }


class FakeRetrieval:
    def __init__(self, *, empty=False, unavailable=False):
        self.calls = []
        self.empty = empty
        self.unavailable = unavailable

    def search(self, query):
        self.calls.append(query)
        if self.unavailable:
            raise ConnectionError("offline")
        return SearchResult(question=query) if self.empty else hit(query)


def run(
    question="Explique l'inflation", *, chat=None, decisions=None, retrieval=None, checkpointer=None
):
    resources = SimpleNamespace(
        chat=chat or FakeChat(),
        decisions=decisions or FakeDecisions(),
        retrieval=retrieval or FakeRetrieval(),
    )
    graph = build_graph(resources=resources, checkpointer=checkpointer)
    state = graph.invoke(
        {"messages": [("human", question)]},
        {"recursion_limit": 80, "configurable": {"thread_id": "test"}},
    )
    return state, resources


@pytest.mark.parametrize("question", ["Hi", "What's up?", "Salut !", "Merci", "Bye"])
def test_jev_routes_social_turn_to_chat_without_retrieval(question):
    state, resources = run(question)
    assert state["kind"] == "conversation"
    assert state["answer"] == "Natural BRH assistant reply"
    assert [task for task, _ in resources.chat.calls] == ["respond"]
    assert len(resources.decisions.calls) == 2
    assert not resources.retrieval.calls
    assert state["route"] == "conversation"
    assert not state["plan"]
    assert state["model_calls"] == 3
    assert state["citations"] == []


@pytest.mark.parametrize("question", ["Hi, compare inflation", "What's up with inflation?"])
def test_model_routes_greeting_prefixed_research_to_retrieval(question):
    state, resources = run(question)
    assert state["kind"] == "answer"
    assert state["plan"]["mode"] == "direct"
    assert resources.retrieval.calls == ["inflation"]


def test_direct_answer_publishes_only_canonical_claim_citations():
    state, resources = run()
    assert state["kind"] == "answer"
    assert resources.retrieval.calls == ["inflation"]
    assert "[1](#brh-source-1)" in state["answer"]
    envelope = state["messages"][-1].additional_kwargs["brh"]
    assert envelope["validated"] and envelope["citations"] == state["citations"]
    assert len(state["messages"]) == 2  # No internal model messages or drafts.


def test_decomposed_goals_fan_out_and_deduplicate_page_citations():
    chat = FakeChat(plan([goal("g1", "inflation"), goal("g2", "monnaie")]))
    state, resources = run(chat=chat)
    assert set(resources.retrieval.calls) == {"inflation", "monnaie"}
    assert len(state["results"]) == 2
    assert len(state["citations"]) == 1


def test_dependencies_are_dispatched_in_later_wave():
    chat = FakeChat(plan([goal("g1", "first"), goal("g2", "second", ["g1"])]))
    state, resources = run(chat=chat)
    assert resources.retrieval.calls == ["first", "second"]
    assert state["kind"] == "answer"


def test_empty_corpus_refines_once_then_reports_insufficient():
    state, resources = run(retrieval=FakeRetrieval(empty=True))
    assert state["kind"] == "insufficient"
    assert resources.retrieval.calls == ["inflation", "inflation refined"]
    assert sum(task == "refine" for task, _ in resources.chat.calls) == 1
    assert not any(task == "answer" for task, _ in resources.chat.calls)


def test_service_failure_is_unavailable_not_insufficient():
    state, resources = run(retrieval=FakeRetrieval(unavailable=True))
    assert state["kind"] == "unavailable"
    assert len(resources.retrieval.calls) == 1


def test_only_missing_goal_is_refined_and_partial_is_explicit():
    chat = FakeChat(plan([goal("g1", "inflation"), goal("g2", "causes")]))
    state, resources = run(chat=chat, decisions=FakeDecisions(missing=["g2"]))
    assert resources.retrieval.calls.count("inflation") == 1
    assert "causes refined" in resources.retrieval.calls
    assert state["kind"] == "partial"
    assert "Réponse partielle" in state["answer"]


@pytest.mark.parametrize("bad_ids", [True, False])
def test_invalid_draft_repairs_once_and_never_publishes(bad_ids):
    state, resources = run(
        chat=FakeChat(bad_draft=bad_ids), decisions=FakeDecisions(unsupported=not bad_ids)
    )
    assert state["kind"] == "safe_limitation"
    assert sum(task == "answer" for task, _ in resources.chat.calls) == 2
    assert state["answer_repairs"] == 1
    assert state["citations"] == []


def test_malformed_plan_repairs_once_then_terminates():
    state, resources = run(chat=FakeChat(invalid_plan=True))
    assert state["kind"] == "safe_limitation"
    assert sum(task == "plan" for task, _ in resources.chat.calls) == 2
    assert not resources.retrieval.calls


def test_explicit_date_lost_by_rewrite_prevents_retrieval():
    state, resources = run("Compare 2024 et 2025")
    assert state["kind"] == "safe_limitation"
    assert not resources.retrieval.calls


def test_clarification_ends_without_search():
    chat = FakeChat(plan([], mode="clarify", clarification="Quelle période ?"))
    state, resources = run("Et pour cette période ?", chat=chat)
    assert state["kind"] == "clarification"
    assert state["answer"] == "Quelle période ?"
    assert not resources.retrieval.calls


def test_checkpoint_reload_resets_turn_evidence_and_preserves_message_citations():
    resources = SimpleNamespace(
        chat=FakeChat(), decisions=FakeDecisions(), retrieval=FakeRetrieval()
    )
    graph = build_graph(resources=resources, checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "isolated"}, "recursion_limit": 80}
    first = graph.invoke({"messages": [("human", "Inflation ?")]}, config)
    second = graph.invoke({"messages": [("human", "Hi")]}, config)
    assert second["results"] == {} and second["evidence"] == {}
    assert second["citations"] == []
    assert first["turn_id"] != second["turn_id"]
    reloaded = graph.get_state(config).values["messages"]
    assert reloaded[1].additional_kwargs["brh"]["citations"]
    assert reloaded[-1].additional_kwargs["brh"]["citations"] == []


def test_worker_reducer_is_idempotent():
    result = {"g1:query": {"status": "ready"}}
    assert merge_results(result, result) == result


def test_custom_activity_stream_shows_real_searches_and_no_model_drafts():
    resources = SimpleNamespace(
        chat=FakeChat(), decisions=FakeDecisions(), retrieval=FakeRetrieval()
    )
    events = list(
        build_graph(resources=resources).stream(
            {"messages": [("human", "Inflation ?")]}, stream_mode="custom"
        )
    )
    assert events[0]["stage"] == "route_intent"
    assert events[0]["status"] == "running"
    searches = [event for event in events if event["stage"] == "search"]
    assert [event["status"] for event in searches] == ["running", "complete"]
    assert searches[0]["id"] == searches[1]["id"]
    assert searches[1]["query"] == resources.retrieval.calls[0]
    assert searches[1]["sources"][0]["page"] == 3
    assert searches[1]["result_count"] == 1
    assert events[-1]["stage"] == "publish"
    assert not any(key in event for event in events for key in ("draft", "prompt", "reasoning"))


def test_model_can_stop_without_forced_refinement():
    class StopDecisions(FakeDecisions):
        def choose(self, state, questions):
            result = super().choose(state, questions)
            if "next_action" in result:
                result["next_action"] = "respond"
            return result

    state, resources = run(decisions=StopDecisions(), retrieval=FakeRetrieval(empty=True))
    assert state["kind"] == "insufficient"
    assert state["answer"] == "Natural BRH assistant reply"
    assert resources.retrieval.calls == ["inflation"]
    assert state["citations"] == []


def test_model_cannot_refine_forever_or_draft_without_evidence():
    class RefineDecisions(FakeDecisions):
        def choose(self, state, questions):
            result = super().choose(state, questions)
            if "next_action" in result:
                result["next_action"] = "refine"
            return result

    state, resources = run(decisions=RefineDecisions(), retrieval=FakeRetrieval(empty=True))
    assert state["kind"] == "insufficient"
    assert state["refinement_count"] == 1
    assert len(resources.retrieval.calls) == 2
    assert not any(task == "answer" for task, _ in resources.chat.calls)


def test_rejected_generated_limitation_is_never_published():
    class RejectDecisions(FakeDecisions):
        def choose(self, state, questions):
            if "response" in questions:
                return {"response": "invalid"}
            return super().choose(state, questions)

    state, _ = run(chat=FakeChat(invalid_plan=True), decisions=RejectDecisions())
    assert state["kind"] == "unavailable"
    assert state["answer"] != "Natural BRH assistant reply"
    assert state["citations"] == []


def test_thread_memory_is_resumed_and_never_shared():
    saver = InMemorySaver()
    chat = FakeChat()
    resources = SimpleNamespace(chat=chat, decisions=FakeDecisions(), retrieval=FakeRetrieval())
    graph = build_graph(resources=resources, checkpointer=saver)
    first = {"configurable": {"thread_id": "first"}}
    second = {"configurable": {"thread_id": "second"}}
    graph.invoke({"messages": [("human", "Hi")]}, first)
    graph = build_graph(resources=resources, checkpointer=saver)
    graph.invoke({"messages": [("human", "Merci")]}, first)
    previous = chat.calls[-1][1]["history"]
    assert [item["role"] for item in previous] == ["human", "ai"]
    assert previous[0]["content"] == "Hi"
    graph.invoke({"messages": [("human", "Hi")]}, second)
    assert chat.calls[-1][1]["history"] == []
    checkpoint = graph.get_state(first).values
    assert len(checkpoint["messages"]) == 4
    assert all(message.type in {"human", "ai"} for message in checkpoint["messages"])


def test_retry_after_completed_run_returns_existing_answer_without_extra_calls():
    resources = SimpleNamespace(
        chat=FakeChat(), decisions=FakeDecisions(), retrieval=FakeRetrieval()
    )
    graph = build_graph(resources=resources, checkpointer=InMemorySaver())
    config = {"configurable": {"thread_id": "retry"}}
    message = {"type": "human", "id": "stable-id", "content": "Inflation ?"}
    first = graph.invoke({"messages": [message]}, config)
    count = len(resources.chat.calls)
    retried = graph.invoke({"messages": [message]}, config)
    assert retried["answer"] == first["answer"]
    assert len(retried["messages"]) == 2
    assert len(resources.chat.calls) == count


def test_evidence_budget_preserves_each_goal_and_prefers_refinements():
    from brh_agent.research import merge_evidence

    results = {}
    for goal_id in ("g1", "g2", "g3", "g4"):
        for index in range(8):
            results[f"{goal_id}:{index}"] = {
                "turn_id": "current",
                "goal_id": goal_id,
                "round": int(index == 7),
                "evidence": [
                    {
                        "chunk_id": f"{goal_id}-{index}",
                        "text": "x" * 8000,
                        "citations": [{"score": 0.9}],
                    }
                ],
            }
    evidence = merge_evidence(
        {
            "turn_id": "current",
            "results": results,
            "plan": plan([goal(name) for name in ("g1", "g2", "g3", "g4")]),
        }
    )
    assert sum(len(item["text"]) for item in evidence.values()) <= 48000
    for goal_id in ("g1", "g2", "g3", "g4"):
        assert any(item["chunk_id"] == f"{goal_id}-7" for item in evidence.values())


def test_dependency_cycle_is_rejected():
    with pytest.raises(ValidationError):
        TaskPlan.model_validate(
            plan([goal("g1", dependencies=["g2"]), goal("g2", dependencies=["g1"])])
        )


def test_missing_provider_configuration_does_not_become_no_evidence():
    class UnavailableChat:
        def call(self, *args):
            raise ModelUnavailable("missing key")

    state, _ = run("Hi", chat=UnavailableChat())
    assert state["kind"] == "unavailable"


def test_turn_budget_exhaustion_stops_before_provider_call():
    from brh_agent.nodes import guarded

    def forbidden(state, resources):
        raise AssertionError("Over-budget model must not run")

    execute = guarded(forbidden, lambda: None)
    assert execute({"deadline": float("inf"), "model_calls": 16}) == {"kind": "budget_exhausted"}
    assert execute({"deadline": 0, "model_calls": 0}) == {"kind": "budget_exhausted"}


@pytest.mark.asyncio
async def test_cancellation_does_not_publish_a_late_model_reply():
    entered, release = Event(), Event()

    class SlowChat:
        def call(self, *args, **kwargs):
            entered.set()
            release.wait(timeout=3)
            return "Late response"

    graph = build_graph(
        resources=SimpleNamespace(chat=SlowChat(), decisions=FakeDecisions()),
        checkpointer=InMemorySaver(),
    )
    config = {"configurable": {"thread_id": "cancelled"}}
    task = asyncio.create_task(graph.ainvoke({"messages": [("human", "Hi")]}, config))
    try:
        assert await asyncio.to_thread(entered.wait, 2)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
    finally:
        release.set()
    state = await graph.aget_state(config)
    assert all(message.type != "ai" for message in state.values["messages"])
