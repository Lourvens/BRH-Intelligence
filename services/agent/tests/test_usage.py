"""Daily token admission, idempotent accounting and graph settlement."""

from datetime import UTC, datetime

from brh_agent.lib.identity import anonymous_identity
from brh_agent.usage.quota import DailyTokenQuota, seconds_until_utc_midnight
from brh_agent.usage.store import MemoryUsageStore
from brh_agent.usage.tokens import add_usage, estimate_usage, normalize_usage
from brh_core.config import Settings
from helpers import Model, build_graph
from langchain_core.messages import AIMessage, HumanMessage

NOW = datetime(2026, 11, 3, 12, 0, tzinfo=UTC)


def _settings(**overrides):
    values = {
        "agent_daily_token_limit": 100,
        "quota_identity_salt": "test-salt",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_usage_normalization_and_estimation_are_additive():
    usage = normalize_usage(
        {"input_tokens": 4, "output_tokens": 3, "total_tokens": 7}
    )
    assert usage == {"input_tokens": 4, "output_tokens": 3, "total_tokens": 7}
    assert add_usage(usage, {"input_tokens": 2, "output_tokens": 1, "total_tokens": 3}) == {
        "input_tokens": 6,
        "output_tokens": 4,
        "total_tokens": 10,
    }
    estimated = estimate_usage([HumanMessage(content="Bonjour")], "Bonsoir")
    assert estimated["input_tokens"] > 0
    assert estimated["output_tokens"] > 0


def test_quota_denies_at_the_limit_and_resets_at_utc_midnight():
    store = MemoryUsageStore()
    quota = DailyTokenQuota(_settings(), store)

    assert quota.check("anon-test", now=NOW).allowed is True
    quota.record(
        "anon-test", "turn-1", {"input_tokens": 60, "output_tokens": 40}, now=NOW
    )
    denied = quota.check("anon-test", now=NOW)
    assert denied.allowed is False
    assert denied.used == 100
    assert denied.remaining == 0
    assert denied.retry_after == seconds_until_utc_midnight(NOW)
    assert quota.check("anon-test", now=datetime(2026, 11, 4, 0, 0, tzinfo=UTC)).allowed

def test_usage_rows_are_idempotent_per_turn():
    store = MemoryUsageStore()
    quota = DailyTokenQuota(_settings(), store)
    usage = {"input_tokens": 20, "output_tokens": 10}
    quota.record("anon-test", "same-turn", usage, now=NOW)
    quota.record("anon-test", "same-turn", usage, now=NOW)
    assert store.used("anon-test", NOW.date()) == 30


def test_graph_settles_usage_only_for_an_authenticated_identity():
    store = MemoryUsageStore()
    quota = DailyTokenQuota(_settings(agent_daily_token_limit=1000), store)
    model = Model(
        [
            AIMessage(
                content="Bonjour !",
                usage_metadata={
                    "input_tokens": 10,
                    "output_tokens": 5,
                    "total_tokens": 15,
                },
            )
        ]
    )
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: model,
        usage_quota=quota,
    )
    config = {
        "configurable": {
            "thread_id": "quota-auth",
            "langgraph_auth_user": {"identity": "anon-test"},
        }
    }
    result = graph.invoke({"messages": [HumanMessage(content="Bonjour")]}, config)
    assert result["usage"]["input_tokens"] >= 10
    assert result["usage"]["output_tokens"] >= 5
    assert store.used("anon-test", datetime.now(UTC).date()) > 0


def test_graph_does_not_settle_without_an_identity():
    store = MemoryUsageStore()
    quota = DailyTokenQuota(_settings(agent_daily_token_limit=1000), store)
    model = Model([AIMessage(content="Bonjour !")])
    graph = build_graph(
        decision=lambda _: "greeting",
        model_factory=lambda: model,
        usage_quota=quota,
    )
    graph.invoke(
        {"messages": [HumanMessage(content="Bonjour")]},
        {"configurable": {"thread_id": "quota-anonymous"}},
    )
    assert store.rows == {}


def test_quota_identities_are_hashed_and_stable():
    first = anonymous_identity("203.0.113.9", "salt")
    second = anonymous_identity("203.0.113.9", "salt")
    assert first == second
    assert first.startswith("anon-")
    assert "203.0.113.9" not in first
    assert first != anonymous_identity("203.0.113.9", "other-salt")
