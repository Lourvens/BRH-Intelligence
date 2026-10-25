"""A derived-data reset resumes without erasing newly regenerated chunks."""

import json
from types import SimpleNamespace

import pytest
from brh_core.db.index_manifest import MemoryIndexLedger
from brh_core.ingestion.reset import ensure_reset_complete, reset_derived


class Repository:
    def __init__(self):
        self.reset = []
        self.fail = True

    def list_documents(self):
        return [SimpleNamespace(document_id="a"), SimpleNamespace(document_id="b")]

    def index_ledger(self):
        return MemoryIndexLedger()

    def reset_derived_document(self, document_id):
        if document_id == "b" and self.fail:
            raise RuntimeError("database interrupted")
        self.reset.append(document_id)


class Store:
    target_id = "old"

    def __init__(self):
        self.ids = {"a:p1:c0", "b:p1:c0", "unrelated:p1:c0"}

    def list_ids(self, prefix):
        return [key for key in self.ids if key.startswith(prefix)]

    def delete(self, ids):
        self.ids.difference_update(ids)


def test_reset_resumes_completed_documents_and_preserves_other_prefixes(tmp_path):
    repository, store = Repository(), Store()
    path = tmp_path / "qwen-reset.json"
    with pytest.raises(RuntimeError, match="interrupted"):
        reset_derived(repository, store, manifest_path=path, new_target="qwen")
    assert json.loads(path.read_text())["completed"] == ["a"]
    repository.fail = False
    reset_derived(repository, store, manifest_path=path, new_target="qwen")
    assert repository.reset == ["a", "b"]
    assert store.ids == {"unrelated:p1:c0"}
    reset_derived(repository, store, manifest_path=path, new_target="qwen")
    assert repository.reset == ["a", "b"]


def test_reset_rejects_a_changed_target(tmp_path):
    repository, store = Repository(), Store()
    repository.fail = False
    path = tmp_path / "reset.json"
    reset_derived(repository, store, manifest_path=path, new_target="qwen")
    with pytest.raises(ValueError, match="targets differ"):
        reset_derived(repository, store, manifest_path=path, new_target="another")


def test_reset_refuses_to_run_beside_supervisor(tmp_path):
    import fcntl

    with (tmp_path / "ocr-index.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        with pytest.raises(RuntimeError, match="Stop the OCR"):
            reset_derived(
                Repository(), Store(), manifest_path=tmp_path / "reset.json", new_target="qwen"
            )


def test_interrupted_reset_blocks_worker_start_until_completed(tmp_path):
    path = tmp_path / "reset.json"
    ensure_reset_complete(path)
    path.write_text(json.dumps({"status": "running"}))
    with pytest.raises(RuntimeError, match="Resume --reset-derived"):
        ensure_reset_complete(path)
    path.write_text(json.dumps({"status": "succeeded"}))
    ensure_reset_complete(path)
