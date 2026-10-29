"""Provider-independent chat construction and structured generation."""

from __future__ import annotations

import json
from functools import lru_cache

from brh_core.config import LLMProvider, Settings, get_settings
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from brh_agent.prompts import AGENT_PROMPT


class ModelUnavailable(RuntimeError):
    """A sanitized provider/configuration failure, safe for the workflow."""


def build_chat_model(settings: Settings | None = None) -> BaseChatModel:
    settings = settings or get_settings()
    if settings.chat_provider == LLMProvider.anthropic:
        from langchain_anthropic import ChatAnthropic

        key = settings.anthropic_api_key.get_secret_value()
        cls = ChatAnthropic
    else:
        from langchain_openai import ChatOpenAI

        key = (
            settings.openrouter_api_key
            if settings.chat_provider == LLMProvider.openrouter
            else settings.openai_api_key
        ).get_secret_value()
        cls = ChatOpenAI
    if not key:
        raise ModelUnavailable(f"Missing chat API key: {settings.chat_provider}")
    return cls(
        model=settings.chat_model,
        api_key=key,
        base_url=settings.chat_base_url,
        temperature=settings.chat_temperature,
        max_tokens=settings.chat_max_tokens,
        timeout=settings.chat_timeout,
        max_retries=settings.chat_max_retries,
        disable_streaming=True,
        tags=["nostream", "brh:chat"],
    )


@lru_cache(maxsize=1)
def get_chat_model() -> BaseChatModel:
    return build_chat_model()


class ChatClient:
    def __init__(self, model):
        self.model = model

    def close(self):
        client = getattr(self.model, "root_client", None)
        if client is not None:
            client.close()

    def call(self, task, task_prompt, payload, schema=None):
        from anthropic import APIError as AnthropicAPIError
        from openai import APIError

        previous = [
            (HumanMessage if item["role"] == "human" else AIMessage)(content=item["content"])
            for item in payload.get("history", [])
            if item.get("role") in {"human", "ai"}
        ]
        task_input = {key: value for key, value in payload.items() if key != "history"}
        messages = [
            SystemMessage(content=AGENT_PROMPT),
            *previous,
            HumanMessage(
                content=json.dumps({"tache": task_prompt, "entree": task_input}, ensure_ascii=False)
            ),
        ]
        try:
            if schema:
                result = self.model.with_structured_output(schema, method="json_schema").invoke(
                    messages, config={"run_name": task, "tags": ["nostream"]}
                )
                return result if isinstance(result, schema) else schema.model_validate(result)
            result = self.model.invoke(messages, config={"run_name": task, "tags": ["nostream"]})
            text = result.text
            if not isinstance(text, str) or not text.strip():
                raise ModelUnavailable("Chat model returned no text")
            return text.strip()
        except (APIError, AnthropicAPIError) as exc:
            raise ModelUnavailable("Chat provider request failed") from exc
