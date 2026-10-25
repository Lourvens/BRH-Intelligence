"""One-time, resumable removal of obsolete chunk and embedding derivatives."""

from __future__ import annotations

import fcntl
import json
import os
import time
from pathlib import Path


def ensure_reset_complete(manifest_path: Path) -> None:
    """Do not let new chunks race with an interrupted destructive reset."""
    if (
        manifest_path.exists()
        and json.loads(manifest_path.read_text()).get("status") != "succeeded"
    ):
        raise RuntimeError("Resume --reset-derived before starting the indexing worker")


def _save(path: Path, state: dict) -> None:
    temporary = path.with_suffix(".tmp")
    with temporary.open("w") as stream:
        json.dump(state, stream, sort_keys=True)
        stream.flush()
        os.fsync(stream.fileno())
    temporary.replace(path)


def reset_derived(repository, old_store, *, manifest_path: Path, new_target: str):
    """Repeat only unfinished documents; completed resets are never replayed."""
    if new_target == old_store.target_id:
        raise ValueError("Old and new reset targets must differ")
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = manifest_path.parent / "ocr-index.lock"
    with lock_path.open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError(
                "Stop the OCR indexing supervisor before resetting derivatives"
            ) from None
        if manifest_path.exists():
            state = json.loads(manifest_path.read_text())
            if state["old_target"] != old_store.target_id or state["new_target"] != new_target:
                raise ValueError(
                    "Reset manifest targets differ; refusing to reset a different corpus"
                )
        else:
            document_ids = [document.document_id for document in repository.list_documents()]
            owners = set(document_ids)
            remote_ids = {}
            for record_id in old_store.list_ids(""):
                owner = record_id.split(":", 1)[0]
                if owner in owners:
                    remote_ids.setdefault(owner, []).append(record_id)
            state = {
                "old_target": old_store.target_id,
                "new_target": new_target,
                "document_ids": document_ids,
                "remote_ids": remote_ids,
                "completed": [],
                "status": "running",
            }
            _save(manifest_path, state)
        if state["status"] == "succeeded":
            return state
        completed = set(state["completed"])
        ledger = repository.index_ledger()
        for document_id in state["document_ids"]:
            if document_id in completed:
                continue
            with ledger.lock(document_id):
                ids = state["remote_ids"].get(document_id, [])
                old_store.delete(ids)
                for attempt in range(8) if ids else ():
                    if not old_store.list_ids(document_id + ":"):
                        break
                    if attempt == 7:
                        raise RuntimeError("Old vectors have not converged; resume the reset")
                    time.sleep(min(0.5 * 2**attempt, 8))
                repository.reset_derived_document(document_id)
                state["completed"].append(document_id)
                _save(manifest_path, state)
        state["status"] = "succeeded"
        _save(manifest_path, state)
        return state
