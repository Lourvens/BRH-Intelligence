"""Smoke tests — the scaffold imports and the contracts are wired.

These pass today (the domain model and config are real). Delete or replace
them as you implement modules; add real tests next to the code they cover.
"""

from brh_core.config import Settings
from brh_core.models import Chunk, Document, Language, SourceKind


def test_settings_load_without_env_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    settings = Settings(_env_file=None)
    assert settings.retrieval_top_k > 0
    assert settings.embedding_model


def test_document_model_is_frozen():
    document = Document(
        document_id="d1",
        sha256="a" * 64,
        slug="rddcf-vol-3",
        title="Revue",
        source_kind=SourceKind.pdf_local,
        language=Language.fr,
    )
    assert document.page_count == 0
    try:
        document.title = "changed"  # type: ignore[misc]
    except Exception:
        return
    raise AssertionError("Document should be immutable")


def test_chunk_char_count():
    chunk = Chunk(chunk_id="c1", document_id="d1", page_number=1, ordinal=0, text="abc")
    assert chunk.char_count == 3
