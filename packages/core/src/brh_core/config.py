"""Application configuration.

One ``Settings`` object is the single source of truth for environment-driven
configuration across every Python surface (ADR-0003, ADR-0004, ADR-0010).

Design notes:

* Field names map to *exact* environment variable names via
  ``validation_alias``. We cannot use a global ``env_prefix`` because some
  variables are not namespaced (``ANTHROPIC_API_KEY``, ``LANGCHAIN_*``).
* ``.env`` is discovered by walking up from the current working directory, so
  the same file is found whether a tool runs from the repo root or from
  ``services/agent``.
* Path-ish settings resolve to absolute :class:`~pathlib.Path` objects in a
  model validator, so downstream code never depends on the CWD.
* Settings are composed from concern-specific mixins in ``config_*.py``.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from brh_core.config_base import (
    ArtifactBackend,
    EmbeddingProvider,
    LLMProvider,
    VectorBackend,
    data_base,
    discover_env_file,
)
from brh_core.config_database import DatabaseSettings
from brh_core.config_llm import LLMSettings
from brh_core.config_retrieval import RetrievalSettings
from brh_core.config_security import SecuritySettings
from brh_core.config_storage import StorageSettings

__all__ = [
    "ArtifactBackend",
    "EmbeddingProvider",
    "LLMProvider",
    "Settings",
    "VectorBackend",
    "get_settings",
]


class Settings(
    StorageSettings,
    DatabaseSettings,
    LLMSettings,
    RetrievalSettings,
    SecuritySettings,
    BaseSettings,
):
    """Environment-driven settings for the whole platform."""

    model_config = SettingsConfigDict(
        env_file=discover_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    # --- Runtime -------------------------------------------------------
    env: str = Field(default="development", validation_alias="BRH_ENV")
    log_format: str = Field(default="plain", validation_alias="BRH_LOG_FORMAT")

    @model_validator(mode="after")
    def _resolve_paths(self) -> Settings:
        base = self.data_root.expanduser().resolve() if self.data_root else data_base()
        object.__setattr__(self, "data_root", base)
        for name in ("raw_dir", "processed_dir", "ocr_dir", "publication_dir"):
            path = Path(getattr(self, name)).expanduser()
            object.__setattr__(self, name, (base / path).resolve())
        return self

    def validate_chunk_limits(self) -> None:
        ceiling = self.chunk_max_tokens or self.chunk_token_limit
        target = self.chunk_target_tokens or ceiling
        if target > ceiling or ceiling > self.model_token_limit:
            raise ValueError("Require chunk target <= chunk maximum <= embedding context limit")

    @property
    def resolved_raw_dir(self) -> Path:
        return Path(self.raw_dir)

    @property
    def resolved_processed_dir(self) -> Path:
        return Path(self.processed_dir)

    @property
    def resolved_ocr_dir(self) -> Path:
        return Path(self.ocr_dir)

    @property
    def web_store_dir(self) -> Path:
        """Content-addressed store for downloaded web artefacts (under raw_dir)."""
        return self.raw_dir / "web"

    def to_safe_dict(self) -> dict[str, Any]:
        """Settings as a dict with secrets redacted — safe to log."""
        data = self.model_dump()
        for key, value in data.items():
            if isinstance(value, SecretStr):
                data[key] = "***" if value.get_secret_value() else ""
        return data


_cache: Settings | None = None


def get_settings(*, refresh: bool = False) -> Settings:
    """Return a process-wide cached :class:`Settings` instance."""
    global _cache
    if _cache is None or refresh:
        _cache = Settings()
    return _cache
