from evals.cases import BehaviorCase, CitationPolicy, case_from_mapping, load_cases
from evals.scoring import score_availability, score_contract, score_stability


def run(**overrides):
    value = {
        "transport_ok": True,
        "phase": "complete",
        "kind": "answer",
        "has_plan": True,
        "mode": "direct",
        "goal_count": 1,
        "citation_count": 1,
        "model_calls": 5,
        "question_numbers": ["2023"],
        "plan_numbers": ["2023"],
    }
    value.update(overrides)
    return value


def direct_case(**overrides):
    value = {
        "case_id": "direct",
        "category": "research",
        "question": "Inflation 2023",
        "expected_kinds": ("answer", "partial"),
        "expected_mode": "direct",
        "min_goals": 1,
        "max_goals": 1,
        "citation_policy": CitationPolicy.REQUIRED,
        "max_model_calls": 16,
        "require_no_plan": False,
        "preserve_numbers": True,
        "notes": "",
    }
    value.update(overrides)
    return BehaviorCase(**value)


def test_reviewed_dataset_is_valid_and_covers_required_behavior_families():
    cases = load_cases()
    categories = {case.category for case in cases}
    assert len(cases) == 12
    assert {"conversation", "direct_research", "decomposition", "prompt_injection"} <= categories
    assert len({case.case_id for case in cases}) == len(cases)


def test_arize_json_string_columns_round_trip_to_the_case_contract():
    row = load_cases()[0].as_arize_example()
    row["expected_kinds"] = '["conversation"]'
    case = case_from_mapping(row)
    assert case.expected_kinds == ("conversation",)


def test_contract_score_separates_supported_success_from_safe_limitation():
    case = direct_case()
    success = score_contract(case, {"runs": [run(), run(), run()]})
    refusal = score_contract(
        case,
        {"runs": [run(kind="safe_limitation", citation_count=0) for _ in range(3)]},
    )
    assert success.score == 1 and success.label == "pass"
    assert refusal.score == 0 and refusal.label == "fail"
    assert "kind" in refusal.metadata and "citations_required" in refusal.metadata


def test_contract_score_detects_lost_dates_and_transport_failure():
    result = score_contract(
        direct_case(),
        {"runs": [run(plan_numbers=[]), {"transport_ok": False}]},
    )
    assert result.score == 0
    assert result.metadata["numbers_lost"] == 1
    assert result.metadata["transport"] == 1


def test_social_contract_forbids_research_plan_and_citations():
    case = direct_case(
        expected_kinds=("conversation",),
        expected_mode=None,
        min_goals=0,
        max_goals=0,
        citation_policy=CitationPolicy.FORBIDDEN,
        max_model_calls=2,
        require_no_plan=True,
        preserve_numbers=False,
    )
    result = score_contract(
        case,
        {
            "runs": [
                run(
                    kind="conversation",
                    has_plan=True,
                    mode=None,
                    goal_count=0,
                    citation_count=1,
                    model_calls=3,
                )
            ]
        },
    )
    assert result.score == 0
    assert {"unexpected_plan", "citations_forbidden", "model_call_budget"} <= set(result.metadata)


def test_stability_and_availability_are_independent_of_contract_quality():
    stable_refusal = {"runs": [run(kind="safe_limitation") for _ in range(3)]}
    mixed = {"runs": [run(), run(kind="safe_limitation"), {"transport_ok": False}]}
    assert score_stability(stable_refusal).score == 1
    assert score_stability(mixed).score == 0.5
    assert score_availability(mixed).score == 2 / 3
