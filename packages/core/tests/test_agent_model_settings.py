"""Agent model roles load independently without making provider requests."""

from pathlib import Path

import pytest
from brh_core.config import LLMProvider, Settings
from pydantic import ValidationError


@pytest.fixture(autouse=True)
def isolate_model_environment(monkeypatch):
    for name in Settings.model_fields:
        if name.startswith(("chat_", "decision_")) or name == "openrouter_api_key":
            monkeypatch.delenv(Settings.model_fields[name].validation_alias, raising=False)


def test_agent_role_defaults_match_template():
    defaults = Settings(_env_file=None)
    template = Settings(_env_file=Path(__file__).resolve().parents[3] / ".env.example")
    for name in Settings.model_fields:
        if name.startswith(("chat_", "decision_")):
            assert getattr(defaults, name) == getattr(template, name)
    assert defaults.chat_provider == defaults.decision_provider == LLMProvider.openrouter
    assert defaults.chat_model == "mistralai/ministral-8b-2512"
    assert defaults.decision_model == "typesafe/jev-1.14"
    assert defaults.decision_base_url + defaults.decision_api_path == (
        "https://openrouter.ai/api/alpha/decisions"
    )


def test_env_template_uses_arize_agent_tracing():
    template_path = Path(__file__).resolve().parents[3] / ".env.example"
    assignments = {
        line.partition("=")[0]: line.partition("=")[2]
        for line in template_path.read_text().splitlines()
        if line and not line.startswith("#") and "=" in line
    }

    assert assignments["ARIZE_PROJECT_NAME"] == "brh-intelligence"
    assert "ARIZE_API_KEY" in assignments
    assert "ARIZE_SPACE_ID" in assignments
    privacy_flags = {
        name: value
        for name, value in assignments.items()
        if name.startswith("OPENINFERENCE_HIDE_")
    }
    assert len(privacy_flags) == 9
    assert set(privacy_flags.values()) == {"true"}
    assert not any(name.startswith("LANGSMITH_") for name in assignments)
    assert not any(name.startswith("LANGCHAIN_") for name in assignments)


def test_model_roles_can_be_overridden_independently(monkeypatch):
    monkeypatch.setenv("BRH_CHAT_BASE_URL", "http://localhost:9000/v1")
    monkeypatch.setenv("BRH_CHAT_MODEL", "custom-chat")
    monkeypatch.setenv("BRH_DECISION_BASE_URL", "http://localhost:9001/api")
    monkeypatch.setenv("BRH_DECISION_API_PATH", "/decisions")
    monkeypatch.setenv("BRH_DECISION_MODEL", "custom-decision")
    monkeypatch.setenv("BRH_LLM_MODEL", "legacy-model")
    settings = Settings(_env_file=None)
    assert settings.chat_base_url == "http://localhost:9000/v1"
    assert settings.chat_model == "custom-chat"
    assert settings.decision_base_url == "http://localhost:9001/api"
    assert settings.decision_api_path == "/decisions"
    assert settings.decision_model == "custom-decision"
    assert settings.llm_model == "legacy-model"


def test_openrouter_credentials_are_independent_and_redacted(monkeypatch):
    monkeypatch.setenv("BRH_LLM_PROVIDER", "openrouter")
    monkeypatch.setenv("OPENROUTER_API_KEY", "agent-secret")
    monkeypatch.setenv("OPENROUTER_EMBEDDING_API_KEY", "embedding-secret")
    settings = Settings(_env_file=None)
    assert settings.llm_api_key() == "agent-secret"
    assert settings.openrouter_embedding_api_key.get_secret_value() == "embedding-secret"
    safe = settings.to_safe_dict()
    assert safe["openrouter_api_key"] == "***"
    assert safe["openrouter_embedding_api_key"] == "***"
    assert "agent-secret" not in str(safe)
    assert "embedding-secret" not in str(safe)


@pytest.mark.parametrize(
    ("name", "value"),
    [
        ("BRH_CHAT_MODEL", ""),
        ("BRH_CHAT_BASE_URL", ""),
        ("BRH_CHAT_MAX_TOKENS", "0"),
        ("BRH_CHAT_TIMEOUT", "0"),
        ("BRH_CHAT_MAX_RETRIES", "-1"),
        ("BRH_DECISION_MODEL", ""),
        ("BRH_DECISION_BASE_URL", ""),
        ("BRH_DECISION_API_PATH", ""),
        ("BRH_DECISION_TIMEOUT", "0"),
        ("BRH_DECISION_MAX_RETRIES", "-1"),
    ],
)
def test_invalid_model_settings_fail_early(monkeypatch, name, value):
    monkeypatch.setenv(name, value)
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
