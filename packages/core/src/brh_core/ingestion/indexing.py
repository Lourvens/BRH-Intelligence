"""Reconcile the desired chunk set with a remote index using durable intent."""

from __future__ import annotations

from collections.abc import Sequence
from hashlib import sha256

from brh_core.models import VectorRecord


class IndexCoordinator:
    def __init__(self, store, ledger, target: str, *, batch_size: int = 96) -> None:
        self.store = store
        self.ledger = ledger
        self.target = target
        self.batch_size = batch_size

    def remember(self, document_id: str, previous_ids: Sequence[str]) -> None:
        """Preserve superseded IDs before the local transaction removes them."""
        state = self.ledger.load(self.target, document_id)
        state.known_ids = sorted(set(state.known_ids) | set(previous_ids))
        self.ledger.save(self.target, document_id, state)

    def succeeded(self, document_id: str, version: str) -> bool:
        state = self.ledger.load(self.target, document_id)
        return state.status == "succeeded" and state.version == version

    def reconcile(self, document_id: str, version: str, records: Sequence[VectorRecord]) -> dict:
        """Persist intent before every remote mutation; replay is idempotent."""
        state = self.ledger.load(self.target, document_id)
        desired = {record.id for record in records}
        if state.version != version:
            state.written_ids = []
            state.deleted_ids = []
        state.version = version
        state.desired_ids = sorted(desired)
        state.known_ids = sorted(set(state.known_ids) | desired)
        state.status = "running"
        state.attempt += 1
        state.error = None
        self.ledger.save(self.target, document_id, state)
        fingerprint = sha256(version.encode()).hexdigest()
        versioned = [
            record.model_copy(
                update={"metadata": {**record.metadata, "index_version": fingerprint}}
            )
            for record in records
        ]
        try:
            matched = self.store.matching_ids(versioned)
            state.written_ids = sorted(matched)
            self.ledger.save(self.target, document_id, state)
            pending = [record for record in versioned if record.id not in matched]
            for offset in range(0, len(pending), self.batch_size):
                batch = pending[offset : offset + self.batch_size]
                if self.store.upsert(batch) != len(batch):
                    raise RuntimeError("Vector store did not acknowledge the complete batch")
                state.written_ids = sorted(set(state.written_ids) | {record.id for record in batch})
                self.ledger.save(self.target, document_id, state)
            # Listing is scoped to our deterministic document prefix, never
            # the entire namespace or another document's records.
            remote = set(self.store.list_ids(document_id + ":"))
            stale = sorted((set(state.known_ids) | remote) - desired)
            for offset in range(0, len(stale), self.batch_size):
                batch_ids = stale[offset : offset + self.batch_size]
                self.store.delete(batch_ids)
                state.deleted_ids = sorted(set(state.deleted_ids) | set(batch_ids))
                self.ledger.save(self.target, document_id, state)
            self.store.verify(versioned, absent_ids=stale)
            if set(self.store.list_ids(document_id + ":")) != desired:
                raise RuntimeError("Remote document ID set has not converged; retry reconciliation")
            state.known_ids = sorted(desired)
            state.status = "succeeded"
            self.ledger.save(self.target, document_id, state)
            return {
                "chunks": len(records),
                "stale_vectors_deleted": len(stale),
                "attempt": state.attempt,
                "target": self.target,
                "vectors_written": len(pending),
                "vectors_reused": len(matched),
            }
        except Exception as exc:
            state.status = "failed"
            state.error = str(exc)
            self.ledger.save(self.target, document_id, state)
            raise
