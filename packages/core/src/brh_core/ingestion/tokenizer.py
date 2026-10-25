"""Exact tokenizer contracts for production embedding inputs."""

from functools import lru_cache
from hashlib import sha256
from pathlib import Path

from brh_core.config import Settings


def production_counter(settings: Settings):
    qwen = settings.embedding_model == "qwen/qwen3-embedding-8b"
    if settings.embedding_model != "multilingual-e5-large" and not qwen:
        raise ValueError("Configure and validate a tokenizer before indexing a different model")
    from huggingface_hub import hf_hub_download
    from tokenizers import Tokenizer

    expected = "Qwen/Qwen3-Embedding-8B" if qwen else "intfloat/multilingual-e5-large"
    if settings.embedding_tokenizer != expected:
        raise ValueError(f"The selected embedding model requires tokenizer {expected}")
    path = hf_hub_download(
        settings.embedding_tokenizer,
        "tokenizer.json",
        revision=settings.embedding_tokenizer_revision,
    )
    tokenizer = Tokenizer.from_file(path)
    tokenizer.no_truncation()
    tokenizer.no_padding()
    prefix = "qwen-raw-specials-v1" if qwen else "e5-passage"
    identity = f"{prefix}:{sha256(Path(path).read_bytes()).hexdigest()}"

    def encode_count(text: str) -> int:
        return len(
            tokenizer.encode(text if qwen else "passage: " + text, add_special_tokens=True).ids
        )

    cached = lru_cache(maxsize=2048)(encode_count)

    def count(text: str) -> int:
        # Bound retained text as well as cache entries in the long-lived worker.
        return cached(text) if len(text) <= 32768 else encode_count(text)

    return identity, count
