"""Graph construction remains offline and accepts an injected checkpointer."""

from brh_agent.graph import build_graph, graph
from brh_agent.prompts import AGENT_PROMPT, PLAN_TASK_PROMPT


def test_graph_compiles():
    assert graph is not None
    nodes = set(graph.get_graph().nodes)
    assert {"prepare", "plan", "search_goal", "draft", "validate_answer", "publish"} <= nodes


def test_build_graph_is_parameterised():
    assert build_graph() is not None


def test_plan_prompt_states_goal_cardinality_contract():
    prompt = " ".join(PLAN_TASK_PROMPT.split())
    assert "mode direct exige exactement un objectif" in prompt
    assert "mode decomposed exige de deux à quatre objectifs" in prompt
    assert "N'utilisez jamais le mode direct avec plusieurs objectifs" in prompt


def test_agent_prompt_owns_identity_goal_and_rules():
    assert "Identité" in AGENT_PROMPT
    assert "Objectif" in AGENT_PROMPT
    assert "Règles permanentes" in AGENT_PROMPT
