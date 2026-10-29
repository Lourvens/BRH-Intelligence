"""Conversation routing and constrained research planning."""

import json
import re

from brh_agent.contracts import TaskPlan
from brh_agent.decisions import choice
from brh_agent.memory import history
from brh_agent.prompts import PLAN_TASK_PROMPT


def route_intent(state, resources):
    route = resources.decisions.choose(
        {"question": state["question"], "history": history(state)},
        {
            "route": choice(
                "Choisissez le chemin valide le plus court pour le message complet. "
                "Une salutation précédant une demande substantielle ne rend pas celle-ci "
                "conversationnelle.",
                conversation=(
                    "Le message complet est une conversation informelle, comme une salutation, "
                    "un remerciement, un au revoir, une question sur l'identité de l'assistant "
                    "ou un rappel d'informations personnelles données dans l'historique, "
                    "sans demande factuelle concernant la BRH."
                ),
                plan=(
                    "Le message demande une information, une comparaison, une explication, une "
                    "clarification ou une autre tâche nécessitant un plan structuré."
                ),
                out_of_scope=(
                    "Le message demande clairement une tâche sans rapport avec les publications "
                    "de la BRH ou l'information monétaire, financière ou économique haïtienne."
                ),
            )
        },
    )["route"]
    return {"route": route, "phase": "routing"}


def make_plan(state, resources):
    plan = resources.chat.call(
        "plan",
        PLAN_TASK_PROMPT,
        {
            "question": state["question"],
            "history": history(state),
            "issues": state.get("issues", []),
        },
        TaskPlan,
    )
    return {"plan": plan.model_dump(), "phase": "planning", "issues": []}


def validate_plan(state, resources):
    plan = TaskPlan.model_validate(state["plan"])
    represented = json.dumps(plan.model_dump(), ensure_ascii=False)
    missing = set(re.findall(r"\d+(?:[.,]\d+)?", state["question"])) - set(
        re.findall(r"\d+(?:[.,]\d+)?", represented)
    )
    if missing:
        return {
            "plan_status": "invalid",
            "issues": ["Des nombres ou dates explicites ont été perdus"],
        }
    judgment = resources.decisions.choose(
        {
            "question": state["question"],
            "history": history(state),
            "plan": plan.model_dump(),
        },
        {
            "plan": choice(
                "Ce plan préserve-t-il la demande complète, les entités, négations, dates, "
                "unités, restrictions documentaires et l'intention? Évaluez aussi le mode "
                "proposé. Choisissez clarify lorsqu'une ambiguïté non résolue change "
                "matériellement la réponse.",
                valid="Le plan répond fidèlement à la demande sans faire de supposition.",
                clarify="L'utilisateur doit préciser un élément manquant déterminant.",
                invalid=(
                    "Le plan perd une contrainte, invente une portée ou choisit le mauvais chemin."
                ),
            )
        },
    )["plan"]
    return {"plan_status": judgment, "issues": [] if judgment == "valid" else [judgment]}
