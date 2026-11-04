"""Shared enums and environment-file discovery for settings."""

from __future__ import annotations

import tomllib
from enum import StrEnum
from pathlib import Path


class LLMProvider(StrEnum):
    """Chat-model backend (ADR-0010)."""

    anthropic = "anthropic"
    openai = "openai"
    openrouter = "openrouter"


class EmbeddingProvider(StrEnum):
    """How chunk text becomes vectors (ADR-0004)."""

    pinecone = "pinecone"  # server-side, Pinecone integrated inference
    openai = "openai"  # client-side, OpenAI-compatible API
    openrouter = "openrouter"  # also reused by research extraction at the user's request
    hashing = "hashing"  # deterministic, offline — tests/dev only


class VectorBackend(StrEnum):
    """Which vector-store adapter to build (ADR-0003)."""

    pinecone_integrated = "pinecone_integrated"
    pinecone = "pinecone"
    memory = "memory"


class ArtifactBackend(StrEnum):
    local = "local"
    s3 = "s3"


def discover_env_file() -> str | None:
    """Return the nearest ``.env`` walking up from the CWD, if any."""
    for directory in (Path.cwd(), *Path.cwd().parents):
        candidate = directory / ".env"
        if candidate.is_file():
            return str(candidate)
    return None


def data_base() -> Path:
    """Resolve the data root from the nearest workspace or ``.env``."""
    env_file = discover_env_file()
    if env_file:
        return Path(env_file).parent
    for directory in (Path.cwd(), *Path.cwd().parents):
        project = directory / "pyproject.toml"
        if project.is_file():
            config = tomllib.loads(project.read_text(encoding="utf-8"))
            if "workspace" in config.get("tool", {}).get("uv", {}):
                return directory
    return Path.cwd()
