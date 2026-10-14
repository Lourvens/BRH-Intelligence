"""Provider-agnostic embedders (ADR-0004).

TODO: keep the :class:`~brh_core.embeddings.base.Embedder` contract; implement
the concrete embedders below.
"""

from brh_core.embeddings.base import Embedder
from brh_core.embeddings.factory import build_embedder
from brh_core.embeddings.hashing import HashingEmbedder

__all__ = ["Embedder", "HashingEmbedder", "build_embedder"]
