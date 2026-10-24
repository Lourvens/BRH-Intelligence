"""Exact tokenizer contract for the selected Pinecone hosted embedding model."""

from hashlib import sha256
from pathlib import Path

from brh_core.config import Settings


def production_counter(settings: Settings):
    if settings.embedding_model != "multilingual-e5-large":
        raise ValueError("Configure and validate a tokenizer before indexing a different model")
    from huggingface_hub import hf_hub_download
    from tokenizers import Tokenizer

    path = hf_hub_download(
        settings.embedding_tokenizer,
        "tokenizer.json",
        revision=settings.embedding_tokenizer_revision,
    )
    tokenizer = Tokenizer.from_file(path)
    tokenizer.no_truncation()
    tokenizer.no_padding()
    identity = f"e5-passage:{sha256(Path(path).read_bytes()).hexdigest()}"

    def count(text: str) -> int:
        return len(tokenizer.encode("passage: " + text, add_special_tokens=True).ids)

    return identity, count
