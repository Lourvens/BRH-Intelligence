"""Persist remote indexing intent independently of corpus content replacement."""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import asdict, dataclass, field

import psycopg
from psycopg.types.json import Jsonb


@dataclass
class IndexManifest:
    version: str = ""
    known_ids: list[str] = field(default_factory=list)
    desired_ids: list[str] = field(default_factory=list)
    written_ids: list[str] = field(default_factory=list)
    deleted_ids: list[str] = field(default_factory=list)
    status: str = "pending"
    attempt: int = 0
    error: str | None = None


class MemoryIndexLedger:
    """Explicit offline test implementation of the manifest store."""

    def __init__(self) -> None:
        self.states: dict[tuple[str, str], dict] = {}

    def load(self, target: str, document_id: str) -> IndexManifest:
        return IndexManifest(**self.states.get((target, document_id), {}))

    def save(self, target: str, document_id: str, state: IndexManifest) -> None:
        self.states[target, document_id] = asdict(state)

    @contextmanager
    def lock(self, document_id: str):
        yield


class PostgresIndexLedger:
    """Write-ahead manifest and session lock for one document at a time."""

    def __init__(self, pool) -> None:
        self._pool = pool

    def load(self, target: str, document_id: str) -> IndexManifest:
        with self._pool.connection() as conn:
            row = conn.execute(
                "SELECT state FROM corpus.index_manifests WHERE target=%s AND document_id=%s",
                (target, document_id),
            ).fetchone()
        return IndexManifest(**row["state"]) if row else IndexManifest()

    def save(self, target: str, document_id: str, state: IndexManifest) -> None:
        with self._pool.connection() as conn:
            conn.execute(
                """INSERT INTO corpus.index_manifests (target, document_id, state)
                VALUES (%s, %s, %s) ON CONFLICT (target, document_id)
                DO UPDATE SET state=EXCLUDED.state, updated_at=now()""",
                (target, document_id, Jsonb(asdict(state))),
            )

    @contextmanager
    def lock(self, document_id: str):
        # Dedicated session avoids consuming the last pooled connection while
        # extraction, checkpoint writes and remote calls hold the lock.
        with psycopg.connect(self._pool.conninfo, autocommit=True) as conn:
            locked = conn.execute(
                "SELECT pg_try_advisory_lock(hashtextextended(%s, 0))", (document_id,)
            ).fetchone()[0]
            if not locked:
                raise RuntimeError(f"Document {document_id} is being ingested by another worker")
            try:
                yield
            finally:
                conn.execute("SELECT pg_advisory_unlock(hashtextextended(%s, 0))", (document_id,))
