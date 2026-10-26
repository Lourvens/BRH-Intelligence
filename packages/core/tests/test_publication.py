"""Publish immutable content before promotion; serving never needs OCR files."""

import io
from datetime import UTC, datetime
from types import SimpleNamespace

import pytest
from botocore.exceptions import ClientError
from brh_core.config import Settings
from brh_core.corpus.models import ResearchDocument
from brh_core.corpus.publication import build_bundle, bundle_prefix, published_bytes
from brh_core.corpus.service import ResearchCorpus
from brh_core.corpus.storage import LocalPublicationStorage, StorageUnavailable
from brh_core.corpus.storage_s3 import S3PublicationStorage
from brh_core.corpus.sync import sync_artifacts
from test_research_corpus import artifact_fixture


def test_bundle_identity_and_immutable_objects(tmp_path):
    artifact = artifact_fixture(tmp_path / "ocr")
    bundle = build_bundle(artifact)
    storage = LocalPublicationStorage(tmp_path / "published")
    bundle.publish(storage)
    bundle.publish(storage)  # Retry does not mutate a publication.
    key = bundle_prefix(artifact.sha256, bundle.publication_id) + "/document.md"
    assert storage.read(key) == artifact.markdown.read_bytes()
    with pytest.raises(StorageUnavailable):
        storage.put(key, b"different")
    assert storage.read(key) == artifact.markdown.read_bytes()
    assert b"/kaggle/private" not in bundle.files["meta.json"]
    assets = artifact.markdown.parent / "assets"
    assets.mkdir()
    (assets / "chart.png").write_bytes(b"png")
    updated = build_bundle(artifact)
    assert updated.artifact_hash == bundle.artifact_hash
    assert updated.publication_id != bundle.publication_id


def test_missing_referenced_figure_or_escaping_symlink_blocks_publication(tmp_path):
    artifact = artifact_fixture(tmp_path, "<!-- page 1 -->\n![x](assets/chart.png)")
    with pytest.raises(ValueError, match="missing"):
        build_bundle(artifact)
    assets = artifact.markdown.parent / "assets"
    assets.symlink_to(tmp_path, target_is_directory=True)
    with pytest.raises(ValueError, match="Symlink"):
        build_bundle(artifact)


def test_local_storage_confines_keys_and_rejects_tampered_bytes(tmp_path):
    artifact = artifact_fixture(tmp_path / "ocr")
    bundle = build_bundle(artifact)
    storage = LocalPublicationStorage(tmp_path / "published")
    bundle.publish(storage)
    for key in ("../secret", "/secret", "a//b", "a/./b", "a\\b"):
        with pytest.raises(ValueError):
            storage.read(key)
    publication = {
        "publication_id": bundle.publication_id,
        "storage_backend": "local",
        "manifest": bundle.manifest,
    }
    with pytest.raises(FileNotFoundError):
        published_bytes(storage, publication, artifact.sha256, "assets/unknown.png")
    path = storage.root / bundle_prefix(artifact.sha256, bundle.publication_id) / "document.md"
    path.write_bytes(b"tampered")
    with pytest.raises(StorageUnavailable, match="checksum"):
        published_bytes(storage, publication, artifact.sha256, "document.md")


def test_page_read_is_independent_of_ocr_and_artifact_storage(tmp_path):
    document = ResearchDocument(
        document_id="id",
        sha256="a" * 64,
        artifact_hash="b" * 64,
        publication_id="c" * 64,
        slug="inflation",
        title="Inflation",
        family="inflation",
        page_count=1,
        synced_at=datetime.now(UTC),
    )
    queries = SimpleNamespace(
        document=lambda _: document, page_snapshot=lambda *_: (document, "Texte publié.")
    )
    settings = Settings(
        _env_file=None,
        ocr_dir=tmp_path / "not-mounted",
        publication_dir=tmp_path / "not-mounted-either",
    )
    service = ResearchCorpus(settings, queries, None)
    assert service.current_document("inflation")[0] == document
    assert service.reader("inflation", 1)["content"].markdown == "Texte publié."
    assert not settings.ocr_dir.exists()
    assert not settings.publication_dir.exists()


def test_failed_upload_never_promotes_database(tmp_path):
    from contextlib import nullcontext

    artifact_fixture(tmp_path / "ocr")
    saved = []
    repository = SimpleNamespace(
        lock=lambda _: nullcontext(), source=lambda _: {}, save=lambda *args: saved.append(args)
    )

    class BrokenStorage:
        backend = "local"

        def put(self, key, data):
            raise StorageUnavailable("Upload failed")

    with pytest.raises(StorageUnavailable):
        sync_artifacts(tmp_path / "ocr", repository, BrokenStorage())
    assert saved == []


def test_s3_conditional_upload_and_verified_retry():
    class FakeS3:
        def __init__(self):
            self.objects = {}

        def put_object(self, **kwargs):
            assert kwargs["IfNoneMatch"] == "*"
            key = kwargs["Key"]
            if key in self.objects:
                raise ClientError(
                    {
                        "Error": {"Code": "PreconditionFailed"},
                        "ResponseMetadata": {"HTTPStatusCode": 412},
                    },
                    "PutObject",
                )
            self.objects[key] = kwargs["Body"]

        def get_object(self, **kwargs):
            return {"Body": io.BytesIO(self.objects[kwargs["Key"]])}

    client = FakeS3()
    storage = S3PublicationStorage("bucket", client=client)
    storage.put("ocr/example", b"data")
    storage.put("ocr/example", b"data")
    with pytest.raises(StorageUnavailable):
        storage.put("ocr/example", b"different")
    assert storage.read("ocr/example") == b"data"
