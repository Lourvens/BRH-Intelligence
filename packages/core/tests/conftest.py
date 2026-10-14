"""Shared test fixtures.

Testing approach (see ADR-0003 / ADR-0004 / ADR-0006):

* Tests run **offline** by default — no Postgres, no Pinecone, no LLM.
* Use the ``memory`` vector backend + ``hashing`` embedder for retrieval tests.
* Fake the repository (duck-typed to ``CorpusRepository``) instead of a DB.
* Mark anything that needs real services ``@pytest.mark.integration``.

TODO: add fixtures here as modules land (e.g. a ``FakeRepository``, an
in-memory ``VectorStore`` populated with a few chunks).
"""

from __future__ import annotations

import pytest


@pytest.fixture
def repo_root() -> str:
    """Absolute path to the repository root (for fixture files)."""
    from pathlib import Path

    return str(Path(__file__).resolve().parents[3])
