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
"""

from __future__ import annotations

from enum import StrEnum
from pathlib import Path
from typing import Any, ClassVar

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class LLMProvider(StrEnum):
    """Chat-model backend (ADR-0010)."""

    anthropic = "anthropic"
    openai = "openai"


class EmbeddingProvider(StrEnum):
    """How chunk text becomes vectors (ADR-0004)."""

    pinecone = "pinecone"  # server-side, Pinecone integrated inference
    openai = "openai"  # client-side, OpenAI-compatible API
    hashing = "hashing"  # deterministic, offline — tests/dev only


class VectorBackend(StrEnum):
    """Which vector-store adapter to build (ADR-0003)."""

    pinecone_integrated = "pinecone_integrated"
    pinecone = "pinecone"
    memory = "memory"


def _discover_env_file() -> str | None:
    """Return the nearest ``.env`` walking up from the CWD, if any.

    Lets ``pydantic-settings`` find the repo-root ``.env`` regardless of which
    workspace member the process was launched from.
    """
    for directory in (Path.cwd(), *Path.cwd().parents):
        candidate = directory / ".env"
        if candidate.is_file():
            return str(candidate)
    return None


class Settings(BaseSettings):
    """Environment-driven settings for the whole platform."""

    model_config = SettingsConfigDict(
        env_file=_discover_env_file(),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
        populate_by_name=True,
    )

    DEFAULT_RAW_DIR: ClassVar[str] = "./data/raw"
    DEFAULT_PROCESSED_DIR: ClassVar[str] = "./data/processed"

    # --- Runtime -------------------------------------------------------
    env: str = Field(default="development", validation_alias="BRH_ENV")
    log_format: str = Field(default="plain", validation_alias="BRH_LOG_FORMAT")

    # --- Paths ---------------------------------------------------------
    # Strings, not Path: pydantic-settings mangles Path-ish defaults. We
    # resolve them to absolute Paths in ``_resolve_paths`` below.
    raw_dir: Path = Field(
        default_factory=lambda: Path(Settings.DEFAULT_RAW_DIR),
        validation_alias="BRH_RAW_DIR",
    )
    processed_dir: Path = Field(
        default_factory=lambda: Path(Settings.DEFAULT_PROCESSED_DIR),
        validation_alias="BRH_PROCESSED_DIR",
    )

    # --- LLM (ADR-0010) ------------------------------------------------
    llm_provider: LLMProvider = Field(
        default=LLMProvider.anthropic, validation_alias="BRH_LLM_PROVIDER"
    )
    llm_model: str = Field(default="claude-sonnet-4-5", validation_alias="BRH_LLM_MODEL")
    llm_temperature: float = Field(default=0.0, validation_alias="BRH_LLM_TEMPERATURE")
    llm_max_tokens: int = Field(default=2048, gt=0, validation_alias="BRH_LLM_MAX_TOKENS")
    anthropic_api_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="ANTHROPIC_API_KEY"
    )
    anthropic_base_url: str = Field(default="", validation_alias="ANTHROPIC_BASE_URL")
    openai_api_key: SecretStr = Field(default=SecretStr(""), validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="", validation_alias="OPENAI_BASE_URL")

    # --- Embeddings (ADR-0004) -----------------------------------------
    embedding_provider: EmbeddingProvider = Field(
        default=EmbeddingProvider.pinecone,
        validation_alias="BRH_EMBEDDING_PROVIDER",
    )
    embedding_model: str = Field(
        default="multilingual-e5-large", validation_alias="BRH_EMBEDDING_MODEL"
    )
    embedding_dim: int = Field(default=1024, gt=0, validation_alias="BRH_EMBEDDING_DIM")

    # --- Vector store (ADR-0003) ---------------------------------------
    pinecone_api_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="BRH_PINECONE_API_KEY"
    )
    pinecone_index_name: str = Field(
        default="brh-intelligence", validation_alias="BRH_PINECONE_INDEX_NAME"
    )
    pinecone_namespace: str = Field(default="default", validation_alias="BRH_PINECONE_NAMESPACE")
    vector_backend: VectorBackend = Field(
        default=VectorBackend.pinecone_integrated,
        validation_alias="BRH_VECTOR_BACKEND",
    )

    # --- Postgres (ADR-0003) -------------------------------------------
    postgres_enabled: bool = Field(default=True, validation_alias="BRH_POSTGRES_ENABLED")
    postgres_host: str = Field(default="localhost", validation_alias="BRH_POSTGRES_HOST")
    postgres_port: int = Field(default=5432, validation_alias="BRH_POSTGRES_PORT")
    postgres_db: str = Field(default="brh_corpus", validation_alias="BRH_POSTGRES_DB")
    postgres_user: str = Field(default="brh", validation_alias="BRH_POSTGRES_USER")
    postgres_password: SecretStr = Field(
        default=SecretStr("brh"), validation_alias="BRH_POSTGRES_PASSWORD"
    )
    postgres_schema: str = Field(default="corpus", validation_alias="BRH_POSTGRES_SCHEMA")
    postgres_pool_min_size: int = Field(default=1, ge=0)
    postgres_pool_max_size: int = Field(default=10, ge=1)

    # --- Retrieval -----------------------------------------------------
    retrieval_top_k: int = Field(default=6, gt=0, validation_alias="BRH_RETRIEVAL_TOP_K")
    retrieval_min_score: float = Field(default=0.35, validation_alias="BRH_RETRIEVAL_MIN_SCORE")
    chunk_size: int = Field(default=1000, gt=0, validation_alias="BRH_CHUNK_SIZE")
    chunk_overlap: int = Field(default=150, ge=0, validation_alias="BRH_CHUNK_OVERLAP")

    # --- Citations -----------------------------------------------------
    public_pdf_base_url: str = Field(
        default="http://localhost:3000/api/pdfs",
        validation_alias="BRH_PUBLIC_PDF_BASE_URL",
    )

    # --- LangGraph / LangSmith (ADR-0009) ------------------------------
    langgraph_url: str = Field(
        default="http://localhost:2024", validation_alias="BRH_LANGGRAPH_URL"
    )
    langgraph_assistant_id: str = Field(
        default="agent", validation_alias="BRH_LANGGRAPH_ASSISTANT_ID"
    )

    # --- CORS ----------------------------------------------------------
    cors_allowed_origins: str = Field(
        default="http://localhost:3000",
        validation_alias="BRH_CORS_ALLOWED_ORIGINS",
    )

    @model_validator(mode="after")
    def _resolve_paths(self) -> Settings:
        object.__setattr__(self, "raw_dir", Path(self.raw_dir).resolve())
        object.__setattr__(self, "processed_dir", Path(self.processed_dir).resolve())
        return self

    @property
    def postgres_dsn(self) -> str:
        """Connection string for psycopg, with the schema pinned."""
        password = self.postgres_password.get_secret_value()
        return (
            f"host={self.postgres_host} port={self.postgres_port} "
            f"dbname={self.postgres_db} user={self.postgres_user} "
            f"password={password} options=-csearch_path={self.postgres_schema},public"
        )

    @property
    def resolved_raw_dir(self) -> Path:
        return Path(self.raw_dir)

    @property
    def resolved_processed_dir(self) -> Path:
        return Path(self.processed_dir)

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    def llm_api_key(self) -> str:
        """The API key for the configured chat provider."""
        if self.llm_provider == LLMProvider.anthropic:
            return self.anthropic_api_key.get_secret_value()
        return self.openai_api_key.get_secret_value()

    def to_safe_dict(self) -> dict[str, Any]:
        """Settings as a dict with secrets redacted — safe to log."""
        data = self.model_dump()
        for key in ("anthropic_api_key", "openai_api_key", "pinecone_api_key", "postgres_password"):
            if key in data:
                data[key] = "***" if data[key] else ""
        return data


_cache: Settings | None = None


def get_settings(*, refresh: bool = False) -> Settings:
    """Return a process-wide cached :class:`Settings` instance."""
    global _cache
    if _cache is None or refresh:
        _cache = Settings()
    return _cache
