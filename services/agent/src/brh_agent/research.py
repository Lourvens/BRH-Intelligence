"""Bounded goal search, canonical evidence merging and typed coverage."""

import time
from hashlib import sha256

import httpx
import psycopg
from langgraph.types import Send

from brh_agent.activity import emit_activity
from brh_agent.contracts import QueryRefinement
from brh_agent.decisions import choice
from brh_agent.prompts import REFINE_TASK_PROMPT


def key(goal_id, query):
    return goal_id + ":" + " ".join(query.casefold().split())


def schedule(state):
    results = state.get("results", {})
    successful = {r["goal_id"] for r in results.values() if r["status"] == "ready"}
    pending = []
    for goal in state["plan"]["goals"]:
        if not set(goal["dependencies"]) <= successful:
            continue
        for query in goal["queries"]:
            search_key = key(goal["goal_id"], query)
            if search_key not in results:
                pending.append(
                    {
                        "turn_id": state["turn_id"],
                        "goal_id": goal["goal_id"],
                        "query": query,
                        "key": search_key,
                        "deadline": state["deadline"],
                        "round": state["refinement_count"],
                    }
                )
    return {"pending": pending[: max(0, 16 - len(results))], "phase": "searching"}


def dispatch(state):
    if state["pending"]:
        return [Send("search_goal", work) for work in state["pending"]]
    return "assess_coverage"


def search_goal(work, resources):
    event_id = "search:" + sha256(work["key"].encode()).hexdigest()[:16]
    emit_activity(work, "search", "running", event_id=event_id, query=work["query"])
    result = {
        "turn_id": work["turn_id"],
        "goal_id": work["goal_id"],
        "query": work["query"],
        "status": "error",
        "evidence": [],
        "round": work.get("round", 0),
    }
    if time.time() >= work["deadline"]:
        emit_activity(work, "search", "error", event_id=event_id, query=work["query"])
        return {"results": {work["key"]: result}}
    try:
        found = resources.retrieval.search(work["query"])
        for chunk in found.chunks:
            pages = {chunk.page_number, int(chunk.metadata.get("page_end", chunk.page_number))}
            citations = [
                c.model_dump(mode="json")
                for c in found.citations
                if c.document_id == chunk.document_id and c.page_number in pages
            ]
            if not citations:
                continue
            result["evidence"].append(
                {"chunk_id": chunk.chunk_id, "text": chunk.text[:8000], "citations": citations}
            )
        result["status"] = "ready" if result["evidence"] else "empty"
    except (
        httpx.HTTPError,
        psycopg.Error,
        RuntimeError,
        TimeoutError,
        ConnectionError,
        ValueError,
    ):
        # Keep source errors distinct from a successful empty retrieval.
        result["status"] = "error"
    sources = [
        {"title": citation["title"], "page": citation["page_number"], "excerpt": item["text"][:280]}
        for item in result["evidence"][:3]
        for citation in item["citations"][:1]
    ]
    emit_activity(
        work,
        "search",
        "error" if result["status"] == "error" else "complete",
        event_id=event_id,
        query=work["query"],
        sources=sources,
        result_count=len(result["evidence"]),
    )
    return {"results": {work["key"]: result}}


def merge_evidence(state):
    chunks = {}
    for result in state["results"].values():
        if result["turn_id"] != state["turn_id"]:
            continue
        for item in result["evidence"]:
            if item["chunk_id"] in chunks:
                chunks[item["chunk_id"]]["goal_ids"].add(result["goal_id"])
                chunks[item["chunk_id"]]["round"] = max(
                    chunks[item["chunk_id"]]["round"], result.get("round", 0)
                )
            else:
                chunks[item["chunk_id"]] = {
                    **item,
                    "goal_ids": {result["goal_id"]},
                    "round": result.get("round", 0),
                }
    # Round-robin goals so one large result cannot consume every context slot.
    ranked = sorted(
        chunks.values(),
        key=lambda item: (
            -item["round"],
            -max(c["score"] for c in item["citations"]),
            item["chunk_id"],
        ),
    )
    queues = [
        [item for item in ranked if goal["goal_id"] in item["goal_ids"]]
        for goal in state["plan"]["goals"]
    ]
    selected, size = {}, 0
    while any(queues) and len(selected) < 24:
        for queue in queues:
            if not queue:
                continue
            item = queue.pop(0)
            if item["chunk_id"] in selected or size + len(item["text"]) > 48000:
                continue
            selected[item["chunk_id"]] = item
            size += len(item["text"])
    return {
        f"e{i}": {**item, "goal_ids": sorted(item["goal_ids"])}
        for i, (_, item) in enumerate(sorted(selected.items()), 1)
    }


def assess(state, resources):
    evidence = merge_evidence(state)
    results = list(state["results"].values())
    if results and all(result["status"] == "error" for result in results):
        return {"kind": "unavailable", "evidence": {}, "support": "insufficient"}
    questions = {
        goal["goal_id"]: choice(
            "Les preuves fournies permettent-elles de répondre entièrement à cet objectif: "
            + goal["objective"]
            + "? Vérifiez précisément les périodes, unités et réserves.",
            supported="Les passages fournis établissent les faits demandés.",
            missing="Aucune preuve admissible n'établit les faits demandés.",
        )
        for goal in state["plan"]["goals"]
    }
    questions["next_action"] = choice(
        "Choisissez la suite de la recherche selon les preuves, la couverture et les requêtes "
        "déjà essayées. Une reformulation reste disponible seulement si refinement_count vaut 0.",
        refine="Une nouvelle requête ciblée peut combler une lacune importante.",
        draft="Les preuves permettent une réponse complète ou partielle utile.",
        respond="Les preuves sont insuffisantes et une nouvelle recherche serait peu utile.",
    )
    reviewed = resources.decisions.choose(
        {
            "question": state["plan"]["standalone_question"],
            "evidence": evidence,
            "goals": state["plan"]["goals"],
            "refinement_count": state["refinement_count"],
            "previous_queries": [result["query"] for result in results],
        },
        questions,
    )
    coverage = {
        goal["goal_id"]: reviewed[goal["goal_id"]] if evidence else "missing"
        for goal in state["plan"]["goals"]
    }
    supported = sum(status == "supported" for status in coverage.values())
    support = (
        "supported" if supported == len(coverage) else ("partial" if supported else "insufficient")
    )
    return {
        "evidence": evidence,
        "coverage": coverage,
        "support": support,
        "next_action": reviewed["next_action"],
        "phase": "assessing",
    }


def refine(state, resources):
    goals = [
        goal
        for goal in state["plan"]["goals"]
        if state["coverage"].get(goal["goal_id"]) == "missing"
    ]
    proposed = resources.chat.call(
        "refine",
        REFINE_TASK_PROMPT,
        {
            "question": state["plan"]["standalone_question"],
            "constraints": state["plan"]["constraints"],
            "goals": goals,
            "previous_queries": [r["query"] for r in state["results"].values()],
        },
        QueryRefinement,
    )
    originals = {goal["goal_id"]: goal for goal in goals}
    judgments = resources.decisions.choose(
        {
            "question": state["plan"]["standalone_question"],
            "constraints": state["plan"]["constraints"],
            "original_goals": goals,
            "refinements": proposed.model_dump(),
        },
        {
            "query_" + g.goal_id: choice(
                "La reformulation de requête proposée pour l'objectif "
                + g.goal_id
                + " préserve-t-elle l'intention, les entités, dates, périodes, unités, "
                "négations et restrictions documentaires? Rejetez tout objectif nouveau "
                "ou sans rapport.",
                valid="Elle préserve fidèlement toutes les contraintes de l'objectif.",
                invalid=("Elle change la portée, perd une contrainte ou ajoute un autre objectif."),
            )
            for g in proposed.goals
        },
    )
    replacements = {}
    for goal in proposed.goals:
        original = originals.get(goal.goal_id)
        if not original or judgments.get("query_" + goal.goal_id) != "valid":
            continue
        queries = [q for q in goal.queries if key(goal.goal_id, q) not in state["results"]]
        if queries:
            replacements[goal.goal_id] = {**original, "queries": queries}
    # Supported goals retain their original queries and are never searched again.
    plan = {
        **state["plan"],
        "goals": [replacements.get(g["goal_id"], g) for g in state["plan"]["goals"]],
    }
    return {"plan": plan, "refinement_count": 1}
