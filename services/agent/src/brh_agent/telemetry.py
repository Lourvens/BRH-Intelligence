"""Optional process-wide Arize instrumentation for the LangChain runtime."""

import logging
import os
from threading import Lock

logger = logging.getLogger(__name__)
_lock = Lock()
_provider = None


def configure_tracing():
    global _provider
    with _lock:
        if _provider is not None:
            return _provider
        key = os.getenv("ARIZE_API_KEY", "").strip()
        space = os.getenv("ARIZE_SPACE_ID", "").strip()
        if not key or not space:
            return None
        try:
            from arize.otel import register
            from openinference.instrumentation import TraceConfig
            from openinference.instrumentation.langchain import LangChainInstrumentor

            capture = os.getenv("BRH_TRACE_CONTENT", "false").strip().lower() in {
                "true",
                "1",
                "yes",
            }
            config = TraceConfig(
                hide_inputs=not capture,
                hide_outputs=not capture,
                hide_input_messages=not capture,
                hide_output_messages=not capture,
                hide_input_text=not capture,
                hide_output_text=not capture,
                hide_prompts=not capture,
                hide_retrieval_documents=not capture,
                hide_llm_invocation_parameters=True,
                hide_llm_tools=True,
                hide_input_images=True,
                hide_embeddings_text=True,
                hide_embeddings_vectors=True,
            )
            provider = register(
                api_key=key,
                space_id=space,
                project_name=os.getenv("ARIZE_PROJECT_NAME", "brh-intelligence"),
                batch=True,
                verbose=False,
            )
            LangChainInstrumentor().instrument(tracer_provider=provider, config=config)
            _provider = provider
        except Exception:
            logger.exception("Arize tracing could not be initialized")
        return _provider
