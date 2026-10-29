"""Arize setup is lazy, idempotent, redacted and cleanly flushed."""

from types import SimpleNamespace

import pytest
from brh_agent import observability


@pytest.fixture(autouse=True)
def isolate_observability(monkeypatch):
    observability._provider = None
    for name in (
        "ARIZE_API_KEY",
        "ARIZE_SPACE_ID",
        "ARIZE_PROJECT_NAME",
        "BRH_TRACE_CONTENT",
        *observability._PRIVACY_FLAGS,
    ):
        monkeypatch.delenv(name, raising=False)
    yield
    observability._provider = None


def test_setup_is_disabled_without_credentials(monkeypatch):
    called = []
    monkeypatch.setattr(observability, "register", lambda **kwargs: called.append(kwargs))
    assert observability.setup_observability() is None
    assert called == []


def test_partial_configuration_is_disabled(monkeypatch, caplog):
    monkeypatch.setenv("ARIZE_API_KEY", "secret")
    assert observability.setup_observability() is None
    assert "both required" in caplog.text
    assert "secret" not in caplog.text


def test_setup_enforces_redaction_and_is_idempotent(monkeypatch):
    events = []
    provider = SimpleNamespace(
        force_flush=lambda **kwargs: events.append(("flush", kwargs)),
        shutdown=lambda: events.append(("shutdown", {})),
    )

    def register(**kwargs):
        events.append(("register", kwargs))
        return provider

    class Instrumentor:
        def instrument(self, **kwargs):
            events.append(("instrument", kwargs))

    monkeypatch.setattr(observability, "register", register)
    monkeypatch.setattr(observability, "LangChainInstrumentor", Instrumentor)
    monkeypatch.setenv("ARIZE_API_KEY", "secret")
    monkeypatch.setenv("ARIZE_SPACE_ID", "space")
    monkeypatch.setenv("ARIZE_PROJECT_NAME", "project")
    monkeypatch.setenv("OPENINFERENCE_HIDE_INPUTS", "false")

    assert observability.setup_observability() is provider
    assert observability.setup_observability() is provider
    assert [event[0] for event in events] == ["register", "instrument"]
    assert events[0][1] == {
        "api_key": "secret",
        "space_id": "space",
        "project_name": "project",
        "batch": True,
        "verbose": False,
    }
    assert events[1][1]["tracer_provider"] is provider
    assert events[1][1]["config"].hide_inputs is True
    assert all(observability.os.environ[name] == "true" for name in observability._PRIVACY_FLAGS)

    observability.shutdown_observability()
    observability.shutdown_observability()
    assert events[-2:] == [("flush", {"timeout_millis": 5_000}), ("shutdown", {})]


def test_explicit_content_capture_overrides_stale_privacy_flags(monkeypatch):
    observed = []
    monkeypatch.setenv("ARIZE_API_KEY", "secret")
    monkeypatch.setenv("ARIZE_SPACE_ID", "space")
    monkeypatch.setenv("BRH_TRACE_CONTENT", "true")
    monkeypatch.setenv("OPENINFERENCE_HIDE_INPUTS", "true")
    monkeypatch.setattr(observability, "register", lambda **kwargs: object())
    monkeypatch.setattr(
        observability,
        "LangChainInstrumentor",
        lambda: SimpleNamespace(instrument=lambda **kwargs: observed.append(kwargs["config"])),
    )
    observability.setup_observability()
    config = observed[0]
    assert config.hide_inputs is False
    assert config.hide_outputs is False
    assert config.hide_input_messages is False
    assert config.hide_output_messages is False
    assert config.hide_retrieval_documents is False
    assert config.hide_llm_invocation_parameters is True
    assert config.hide_embeddings_vectors is True
