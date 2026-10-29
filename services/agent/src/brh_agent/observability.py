"""Process-owned Arize tracing with explicit opt-in content capture."""

from __future__ import annotations

import logging
import os
from threading import RLock
from typing import Any

from arize.otel import register
from openinference.instrumentation import TraceConfig
from openinference.instrumentation.langchain import LangChainInstrumentor

logger = logging.getLogger(__name__)

_provider: Any | None = None
_lock = RLock()
_PRIVACY_FLAGS = (
    "OPENINFERENCE_HIDE_INPUTS",
    "OPENINFERENCE_HIDE_OUTPUTS",
    "OPENINFERENCE_HIDE_LLM_INVOCATION_PARAMETERS",
    "OPENINFERENCE_HIDE_LLM_TOOLS",
    "OPENINFERENCE_HIDE_PROMPTS",
    "OPENINFERENCE_HIDE_CHOICES",
    "OPENINFERENCE_HIDE_EMBEDDINGS_TEXT",
    "OPENINFERENCE_HIDE_EMBEDDINGS_VECTORS",
    "OPENINFERENCE_HIDE_RETRIEVAL_DOCUMENTS",
    "OPENINFERENCE_HIDE_INPUT_MESSAGES",
    "OPENINFERENCE_HIDE_OUTPUT_MESSAGES",
    "OPENINFERENCE_HIDE_INPUT_TEXT",
    "OPENINFERENCE_HIDE_OUTPUT_TEXT",
    "OPENINFERENCE_HIDE_INPUT_IMAGES",
)
_CONTENT_FLAGS = {
    "OPENINFERENCE_HIDE_INPUTS",
    "OPENINFERENCE_HIDE_OUTPUTS",
    "OPENINFERENCE_HIDE_INPUT_MESSAGES",
    "OPENINFERENCE_HIDE_OUTPUT_MESSAGES",
    "OPENINFERENCE_HIDE_INPUT_TEXT",
    "OPENINFERENCE_HIDE_OUTPUT_TEXT",
    "OPENINFERENCE_HIDE_PROMPTS",
    "OPENINFERENCE_HIDE_CHOICES",
    "OPENINFERENCE_HIDE_RETRIEVAL_DOCUMENTS",
}


def trace_content_enabled() -> bool:
    return os.getenv("BRH_TRACE_CONTENT", "false").strip().lower() in {"true", "1", "yes"}


def setup_observability() -> Any | None:
    """Configure one batched exporter when both Arize credentials are present."""
    global _provider
    with _lock:
        if _provider is not None:
            return _provider

        api_key = os.getenv("ARIZE_API_KEY", "").strip()
        space_id = os.getenv("ARIZE_SPACE_ID", "").strip()
        project_name = os.getenv("ARIZE_PROJECT_NAME", "brh-intelligence").strip()
        configured = [bool(api_key), bool(space_id)]
        if not any(configured):
            return None
        if not all(configured):
            logger.warning(
                "Arize tracing disabled: ARIZE_API_KEY and ARIZE_SPACE_ID are both required"
            )
            return None

        capture_content = trace_content_enabled()
        for name in _PRIVACY_FLAGS:
            os.environ[name] = "false" if capture_content and name in _CONTENT_FLAGS else "true"
        config = TraceConfig(
            **{
                name.removeprefix("OPENINFERENCE_").lower(): os.environ[name] == "true"
                for name in _PRIVACY_FLAGS
            }
        )

        provider = register(
            api_key=api_key,
            space_id=space_id,
            project_name=project_name or "brh-intelligence",
            batch=True,
            verbose=False,
        )
        LangChainInstrumentor().instrument(tracer_provider=provider, config=config)
        _provider = provider
        logger.info(
            "Arize tracing enabled for project %s (content capture: %s)",
            project_name,
            capture_content,
        )
        return provider


def shutdown_observability() -> None:
    """Flush queued spans before the Agent Server process exits."""
    global _provider
    with _lock:
        if _provider is None:
            return
        _provider.force_flush(timeout_millis=5_000)
        _provider.shutdown()
        _provider = None
