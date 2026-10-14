"""Chat-model factory (ADR-0010).

Nodes never import a provider SDK. They call :func:`build_chat_model`, which
returns a LangChain ``BaseChatModel`` chosen by ``BRH_LLM_PROVIDER``.

TODO: implement. Watch out: some proxies enable extended thinking; a small
``max_tokens`` can be entirely consumed by the thinking block, yielding an
empty string. ``BRH_LLM_MAX_TOKENS`` defaults to 2048 for this reason.
"""

from __future__ import annotations

from functools import lru_cache

from brh_core.config import Settings
from langchain_core.language_models.chat_models import BaseChatModel


def build_chat_model(settings: Settings | None = None) -> BaseChatModel:
    """Return the configured chat model.

    ``anthropic`` -> ``langchain_anthropic.ChatAnthropic``;
    ``openai`` -> ``langchain_openai.ChatOpenAI``. Honour the matching
    ``*_BASE_URL`` for gateways.
    """
    raise NotImplementedError("TODO: switch on settings.llm_provider")


@lru_cache(maxsize=1)
def get_chat_model() -> BaseChatModel:
    """Process-wide cached chat model."""
    raise NotImplementedError("TODO: cache build_chat_model()")
