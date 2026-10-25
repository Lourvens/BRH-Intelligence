"""Bounded LangChain Qwen embeddings with a versioned retrieval contract."""

from __future__ import annotations

import logging
import math
import random
import time
from collections.abc import Callable, Sequence
from threading import BoundedSemaphore, Event, Lock

import httpx

from brh_core.embeddings.errors import EmbeddingBlockedError

logger = logging.getLogger(__name__)
QUERY_INSTRUCTION = (
    "Instruct: Given a French financial question, retrieve relevant passages "
    "from Banque de la Republique d'Haiti documents that answer the question.\nQuery: "
)
QWEN_CONTRACT = "qwen-native4096-prefix1024-l2-query-v1"


class OpenRouterEmbedder:
    """Share request limits across the document tasks of a single worker."""

    def __init__(self, settings, *, client=None, count_tokens: Callable | None = None):
        if settings.embedding_model != "qwen/qwen3-embedding-8b" or settings.embedding_dim != 1024:
            raise ValueError("The validated OpenRouter contract requires Qwen3-Embedding-8B / 1024")
        settings.validate_chunk_limits()
        if count_tokens is None:
            from brh_core.ingestion.tokenizer import production_counter

            _, count_tokens = production_counter(settings)
        if client is None:
            from langchain_openai import OpenAIEmbeddings

            key = settings.openrouter_embedding_api_key.get_secret_value()
            if not key:
                raise ValueError("OPENROUTER_EMBEDDING_API_KEY is required")
            client = OpenAIEmbeddings(
                model=settings.embedding_model,
                api_key=key,
                base_url="https://openrouter.ai/api/v1",
                check_embedding_ctx_length=False,
                model_kwargs={"encoding_format": "float"},
                chunk_size=settings.embedding_batch_size,
                max_retries=0,
                request_timeout=settings.index_timeout,
                http_client=httpx.Client(event_hooks={"response": [self._record_usage]}),
            )
        self._client = client
        self.dimension = settings.embedding_dim
        self._count = count_tokens
        self._context = settings.model_token_limit
        self._batch_size = settings.embedding_batch_size
        self._batch_tokens = settings.embedding_batch_tokens
        self._retries = settings.index_max_retries
        self._semaphore = BoundedSemaphore(settings.embedding_concurrency)
        self._rate_lock = Lock()
        self._metrics_lock = Lock()
        self._next_request = 0.0
        self._interval = 1 / settings.embedding_requests_per_second
        self.blocked = Event()
        self.metrics = {"requests": 0, "retries": 0, "input_tokens": 0, "reported_tokens": 0}

    def _record_usage(self, response):
        if response.status_code == 200:
            response.read()
            usage = response.json().get("usage") or {}
            with self._metrics_lock:
                self.metrics["reported_tokens"] += usage.get("total_tokens", 0)

    def embed_documents(self, texts: Sequence[str]) -> list[list[float]]:
        return [vector for batch in self.embed_document_batches(texts) for vector in batch]

    def embed_document_batches(self, texts: Sequence[str]):
        """Yield successful requests immediately so storage can persist each one."""
        counts = [self._validate_input(text) for text in texts]
        batch, tokens = [], 0
        for text, count in zip(texts, counts, strict=True):
            if count > self._batch_tokens:
                raise ValueError("Embedding input exceeds the configured request token budget")
            if batch and (len(batch) >= self._batch_size or tokens + count > self._batch_tokens):
                yield self._request(batch, tokens)
                batch, tokens = [], 0
            batch.append(text)
            tokens += count
        if batch:
            yield self._request(batch, tokens)

    def embed_query(self, text: str) -> list[float]:
        if not text.strip():
            raise ValueError("Cannot embed an empty query")
        return self.embed_documents([QUERY_INSTRUCTION + text])[0]

    def _validate_input(self, text: str) -> int:
        if not text.strip():
            raise ValueError("Cannot embed empty text")
        count = self._count(text)
        if count > self._context:
            raise ValueError(
                "Embedding input exceeds the model context limit; truncation is disabled"
            )
        return count

    def _request(self, texts: list[str], tokens: int) -> list[list[float]]:
        with self._semaphore:
            for attempt in range(self._retries + 1):
                if self.blocked.is_set():
                    raise EmbeddingBlockedError(
                        "Embedding worker stopped after a permanent failure"
                    )
                with self._rate_lock:
                    delay = max(0, self._next_request - time.monotonic())
                    self._next_request = max(time.monotonic(), self._next_request) + self._interval
                if self.blocked.wait(delay):
                    raise EmbeddingBlockedError(
                        "Embedding worker stopped after a permanent failure"
                    )
                started = time.monotonic()
                with self._metrics_lock:
                    self.metrics["requests"] += 1
                    self.metrics["input_tokens"] += tokens
                try:
                    values = self._client.embed_documents(texts)
                    if len(values) != len(texts):
                        raise EmbeddingBlockedError(
                            "Embedding response count does not match the request"
                        )
                    transformed = [self._reduce(vector) for vector in values]
                    logger.info(
                        "Embedding batch texts=%d tokens=%d seconds=%.2f",
                        len(texts),
                        tokens,
                        time.monotonic() - started,
                    )
                    return transformed
                except Exception as exc:
                    status = getattr(exc, "status_code", getattr(exc, "status", None))
                    message = str(exc).lower()
                    permanent = (
                        isinstance(exc, EmbeddingBlockedError)
                        or status in (401, 402, 403, 404)
                        or any(
                            word in message
                            for word in (
                                "insufficient credit",
                                "insufficient_credit",
                                "monthly",
                                "quota exceeded",
                                "token limit",
                            )
                        )
                    )
                    if permanent:
                        self.blocked.set()
                        raise EmbeddingBlockedError(
                            f"Embedding stopped: permanent provider failure (status={status})"
                        ) from None
                    retryable = (
                        status in (408, 429, 500, 502, 503, 504)
                        or isinstance(exc, (TimeoutError, ConnectionError, httpx.TransportError))
                        or type(exc).__name__ in ("APIConnectionError", "APITimeoutError")
                    )
                    if not retryable or attempt == self._retries:
                        raise RuntimeError(
                            f"Embedding request failed (status={status}, type={type(exc).__name__})"
                        ) from None
                    response = getattr(exc, "response", None)
                    retry_after = (
                        response.headers.get("retry-after") if response is not None else None
                    )
                    try:
                        delay = (
                            min(float(retry_after), 30)
                            if retry_after
                            else random.uniform(0, min(2**attempt, 30))
                        )
                    except ValueError:
                        delay = random.uniform(0, min(2**attempt, 30))
                    with self._metrics_lock:
                        self.metrics["retries"] += 1
                    self.blocked.wait(max(0, delay))
        raise RuntimeError("Embedding request did not complete")

    def _reduce(self, vector: Sequence[float]) -> list[float]:
        if len(vector) != 4096 or not all(math.isfinite(value) for value in vector):
            raise EmbeddingBlockedError("Expected a finite native 4096-dimension Qwen vector")
        prefix = list(vector[: self.dimension])
        norm = math.sqrt(sum(value * value for value in prefix))
        if norm == 0:
            raise EmbeddingBlockedError("Embedding response has a zero vector prefix")
        return [value / norm for value in prefix]
