"""Build and verify immutable OCR bundles before database promotion."""

import json
import mimetypes
import re
from dataclasses import dataclass

from brh_core.corpus.storage import StorageUnavailable, digest, safe_key

RASTER_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}


def canonical_json(value) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def bundle_prefix(sha256: str, publication_id: str) -> str:
    if not all(re.fullmatch("[a-f0-9]{64}", v) for v in (sha256, publication_id)):
        raise ValueError("Invalid publication identity")
    return f"ocr/{sha256}/{publication_id}"


@dataclass(frozen=True)
class Bundle:
    publication_id: str
    artifact_hash: str
    manifest: dict
    files: dict[str, bytes]

    def publish(self, storage):
        prefix = bundle_prefix(self.manifest["sha256"], self.publication_id)
        for name, data in self.files.items():
            storage.put(f"{prefix}/{name}", data)
        # Completion marker is uploaded last, after all verified immutable objects.
        storage.put(f"{prefix}/manifest.json", canonical_json(self.manifest))


def build_bundle(artifact, title=None) -> Bundle:
    directory = artifact.markdown.parent.resolve()
    if (directory / "assets").is_symlink():
        raise ValueError("Symlink in OCR assets")
    files = {"document.md": artifact.markdown.read_bytes()}
    # Retain public extraction provenance, never runner paths or credentials.
    files["meta.json"] = canonical_json(
        {
            key: artifact.metadata.get(key)
            for key in ("sha256", "engine", "engine_version", "pages", "figures", "finished_at")
        }
    )
    for path in sorted((directory / "assets").rglob("*")):
        if path.is_symlink():
            raise ValueError("Symlink in OCR assets")
        if not path.is_file():
            continue
        if path.suffix.lower() not in RASTER_SUFFIXES:
            continue
        if not path.resolve().is_relative_to(directory):
            raise ValueError("Asset escapes OCR directory")
        name = safe_key(path.relative_to(directory).as_posix())
        files[name] = path.read_bytes()
    text = files["document.md"].decode("utf-8")
    references = re.findall(r"""(?:\]\(|src=["'])(assets/[^\s)"'<>]+)""", text)
    if any(safe_key(name) not in files for name in references):
        raise ValueError("Referenced raster asset is missing or unsupported")
    manifest = {
        "format": 1,
        "sha256": artifact.sha256,
        "title": title or artifact.metadata.get("title") or f"Document BRH {artifact.sha256[:8]}",
        "artifact_hash": digest(files["document.md"]),
        "files": {
            name: {
                "sha256": digest(data),
                "size": len(data),
                "content_type": mimetypes.guess_type(name)[0] or "application/octet-stream",
            }
            for name, data in files.items()
        },
    }
    return Bundle(digest(canonical_json(manifest)), manifest["artifact_hash"], manifest, files)


def published_bytes(storage, publication, sha256, name):
    safe_key(name)
    if storage.backend != publication["storage_backend"]:
        raise StorageUnavailable("Publication storage configuration differs")
    entry = publication["manifest"]["files"].get(name)
    if entry is None:
        raise FileNotFoundError("Asset not in publication")
    key = f"{bundle_prefix(sha256, publication['publication_id'])}/{name}"
    data = storage.read(key)
    if len(data) != entry["size"] or digest(data) != entry["sha256"]:
        raise StorageUnavailable("Published object checksum mismatch")
    return data, entry
