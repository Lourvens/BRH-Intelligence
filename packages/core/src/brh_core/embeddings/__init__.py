"""Provider-agnostic embedders (ADR-0004).

OpenRouter Qwen and offline hashing implement the shared Embedder contract.
Pinecone integrated inference embeds remotely; generic OpenAI remains a scaffold.
"""

from brh_core.embeddings.base import Embedder
from brh_core.embeddings.factory import build_embedder
from brh_core.embeddings.hashing import HashingEmbedder

__all__ = ["Embedder", "HashingEmbedder", "build_embedder"]
