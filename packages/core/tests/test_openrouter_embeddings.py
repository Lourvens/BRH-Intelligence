"""Qwen's formatting, token budgets, transformation and permanent failures."""

import math
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from types import SimpleNamespace

import pytest
from brh_core.config import Settings
from brh_core.embeddings.errors import EmbeddingBlockedError
from brh_core.embeddings.openrouter import QUERY_INSTRUCTION, OpenRouterEmbedder


def settings(**kwargs):
    return Settings(
        _env_file=None,
        embedding_provider="openrouter",
        embedding_model="qwen/qwen3-embedding-8b",
        chunk_target_tokens=768,
        chunk_max_tokens=1536,
        embedding_requests_per_second=100000,
        **kwargs,
    )


class Client:
    def __init__(self, vector=None):
        self.calls = []
        self.vector = vector if vector is not None else [1.0] * 4096

    def embed_documents(self, texts):
        self.calls.append(list(texts))
        return [self.vector for _ in texts]


def test_documents_are_raw_queries_are_instructed_and_both_are_normalized():
    client = Client()
    embedder = OpenRouterEmbedder(settings(), client=client, count_tokens=len)
    document = embedder.embed_documents(["Réserves internationales"])[0]
    query = embedder.embed_query("Quelles réserves en 2024 ?")
    assert client.calls == [
        ["Réserves internationales"],
        [QUERY_INSTRUCTION + "Quelles réserves en 2024 ?"],
    ]
    assert len(query) == len(document) == 1024
    assert math.isclose(sum(x * x for x in document), 1)


def test_batches_respect_both_count_and_exact_token_budgets():
    client = Client()
    embedder = OpenRouterEmbedder(
        settings(embedding_batch_size=2, embedding_batch_tokens=5), client=client, count_tokens=len
    )
    embedder.embed_documents(["abc", "def", "a", "b"])
    assert client.calls == [["abc"], ["def", "a"], ["b"]]
    with pytest.raises(ValueError, match="request token budget"):
        embedder.embed_documents(["abcdef"])


def test_model_cap_counts_query_instruction_and_never_truncates():
    client = Client()
    embedder = OpenRouterEmbedder(
        settings(embedding_context_limit=1536), client=client, count_tokens=len
    )
    with pytest.raises(ValueError, match="model context"):
        embedder.embed_query("a" * 1536)
    assert not client.calls


@pytest.mark.parametrize("vector", [[1.0] * 1024, [float("nan")] * 4096, [0.0] * 4096])
def test_provider_contract_failure_blocks_following_requests(vector):
    client = Client(vector)
    embedder = OpenRouterEmbedder(settings(), client=client, count_tokens=len)
    with pytest.raises(EmbeddingBlockedError):
        embedder.embed_documents(["Texte"])
    with pytest.raises(EmbeddingBlockedError):
        embedder.embed_documents(["Autre texte"])
    assert len(client.calls) == 1


def test_hard_quota_is_not_retried_or_logged_as_provider_body():
    class QuotaClient:
        calls = 0

        def embed_documents(self, texts):
            self.calls += 1
            error = RuntimeError("Monthly quota exceeded sensitive-provider-body")
            error.status_code = 429
            raise error

    client = QuotaClient()
    embedder = OpenRouterEmbedder(settings(), client=client, count_tokens=len)
    with pytest.raises(EmbeddingBlockedError, match="status=429") as exc:
        embedder.embed_documents(["Texte"])
    assert "sensitive-provider-body" not in str(exc.value)
    assert client.calls == 1


def test_transient_retry_honors_retry_after():
    class RetryClient(Client):
        def embed_documents(self, texts):
            if not self.calls:
                self.calls.append(list(texts))
                error = RuntimeError("rate limited")
                error.status_code = 429
                error.response = SimpleNamespace(headers={"retry-after": "0"})
                raise error
            return super().embed_documents(texts)

    client = RetryClient()
    embedder = OpenRouterEmbedder(settings(), client=client, count_tokens=len)
    assert len(embedder.embed_documents(["Texte"])) == 1
    assert embedder.metrics["retries"] == 1


def test_concurrent_documents_share_request_semaphore():
    import time

    class ConcurrentClient(Client):
        def __init__(self):
            super().__init__()
            self.lock, self.active, self.maximum = Lock(), 0, 0

        def embed_documents(self, texts):
            with self.lock:
                self.active += 1
                self.maximum = max(self.maximum, self.active)
            time.sleep(0.01)
            with self.lock:
                self.active -= 1
            return super().embed_documents(texts)

    client = ConcurrentClient()
    embedder = OpenRouterEmbedder(settings(), client=client, count_tokens=len)
    with ThreadPoolExecutor(4) as executor:
        list(executor.map(lambda _: embedder.embed_documents(["Texte"]), range(8)))
    assert client.maximum == 2


def test_invalid_chunk_limits_fail_before_provider_calls():
    with pytest.raises(ValueError, match="chunk target"):
        settings().model_copy(update={"chunk_target_tokens": 2000}).validate_chunk_limits()
    with pytest.raises(ValueError, match="Unknown embedding model"):
        _ = Settings(_env_file=None, embedding_model="unknown").model_token_limit
