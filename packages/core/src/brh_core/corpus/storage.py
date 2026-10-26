"""Immutable byte storage shared by publishers and read-only API processes."""

import hashlib
import os
import tempfile
from contextlib import suppress
from pathlib import Path, PurePosixPath
from typing import Protocol


class StorageUnavailable(RuntimeError):
    pass


def safe_key(key: str) -> str:
    if not key or "\\" in key or any(p in {"", ".", ".."} for p in key.split("/")):
        raise ValueError("Invalid storage key")
    if PurePosixPath(key).is_absolute():
        raise ValueError("Invalid storage key")
    return key


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


class PublicationStorage(Protocol):
    backend: str

    def read(self, key: str) -> bytes: ...
    def put(self, key: str, data: bytes) -> None: ...


class LocalPublicationStorage:
    backend = "local"

    def __init__(self, root: Path):
        self.root = root.resolve()

    def _path(self, key):
        path = (self.root / safe_key(key)).resolve()
        if not path.is_relative_to(self.root):
            raise ValueError("Storage path escapes publication root")
        return path

    def read(self, key):
        try:
            return self._path(key).read_bytes()
        except OSError as exc:
            raise StorageUnavailable("Published object unavailable") from exc

    def put(self, key, data):
        path = self._path(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        # Link a fully flushed temporary file: readers never see a partial object.
        fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".publish-")
        try:
            with os.fdopen(fd, "wb") as handle:
                handle.write(data)
                handle.flush()
                os.fsync(handle.fileno())
            with suppress(FileExistsError):
                os.link(temporary, path)
            if self.read(key) != data:
                raise StorageUnavailable("Immutable object checksum mismatch")
        finally:
            Path(temporary).unlink(missing_ok=True)


def publication_storage(settings) -> PublicationStorage:
    if settings.artifact_backend == "s3":
        from brh_core.corpus.storage_s3 import S3PublicationStorage

        return S3PublicationStorage(
            settings.artifact_s3_bucket,
            endpoint=settings.artifact_s3_endpoint,
            region=settings.artifact_s3_region,
        )
    return LocalPublicationStorage(settings.publication_dir)
