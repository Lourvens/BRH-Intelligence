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

import tomllib
from enum import StrEnum
from pathlib import Path
from typing import Any, ClassVar

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


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


def _data_base() -> Path:
    env_file = _discover_env_file()
    if env_file:
        return Path(env_file).parent
    for directory in (Path.cwd(), *Path.cwd().parents):
        project = directory / "pyproject.toml"
        if project.is_file():
            config = tomllib.loads(project.read_text(encoding="utf-8"))
            if "workspace" in config.get("tool", {}).get("uv", {}):
                return directory
    return Path.cwd()


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
    data_root: Path | None = Field(default=None, validation_alias="BRH_DATA_ROOT")
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
    ocr_dir: Path = Field(
        default_factory=lambda: Path("./data/ocr"),
        validation_alias="BRH_OCR_DIR",
    )
    publication_dir: Path = Field(
        default_factory=lambda: Path("./data/published"),
        validation_alias="BRH_PUBLICATION_DIR",
    )
    artifact_backend: ArtifactBackend = Field(
        default=ArtifactBackend.local, validation_alias="BRH_ARTIFACT_BACKEND"
    )
    artifact_s3_bucket: str = Field(default="", validation_alias="BRH_ARTIFACT_S3_BUCKET")
    artifact_s3_endpoint: str = Field(default="", validation_alias="BRH_ARTIFACT_S3_ENDPOINT")
    artifact_s3_region: str = Field(default="us-east-1", validation_alias="BRH_ARTIFACT_S3_REGION")

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

    # --- Agent model roles (OpenRouter) --------------------------------
    openrouter_api_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="OPENROUTER_API_KEY"
    )
    chat_provider: LLMProvider = Field(
        default=LLMProvider.openrouter, validation_alias="BRH_CHAT_PROVIDER"
    )
    chat_base_url: str = Field(
        default="https://openrouter.ai/api/v1",
        min_length=1,
        validation_alias="BRH_CHAT_BASE_URL",
    )
    chat_model: str = Field(
        default="mistralai/ministral-8b-2512",
        min_length=1,
        validation_alias="BRH_CHAT_MODEL",
    )
    chat_temperature: float = Field(default=0, ge=0, validation_alias="BRH_CHAT_TEMPERATURE")
    chat_max_tokens: int = Field(default=2048, gt=0, validation_alias="BRH_CHAT_MAX_TOKENS")
    chat_timeout: float = Field(default=60, gt=0, validation_alias="BRH_CHAT_TIMEOUT")
    chat_max_retries: int = Field(default=2, ge=0, validation_alias="BRH_CHAT_MAX_RETRIES")

    decision_provider: LLMProvider = Field(
        default=LLMProvider.openrouter, validation_alias="BRH_DECISION_PROVIDER"
    )
    decision_base_url: str = Field(
        default="https://openrouter.ai/api",
        min_length=1,
        validation_alias="BRH_DECISION_BASE_URL",
    )
    decision_api_path: str = Field(
        default="/alpha/decisions", min_length=1, validation_alias="BRH_DECISION_API_PATH"
    )
    decision_model: str = Field(
        default="typesafe/jev-1.14", min_length=1, validation_alias="BRH_DECISION_MODEL"
    )
    decision_timeout: float = Field(default=60, gt=0, validation_alias="BRH_DECISION_TIMEOUT")
    decision_max_retries: int = Field(default=2, ge=0, validation_alias="BRH_DECISION_MAX_RETRIES")

    # --- Embeddings (ADR-0004) -----------------------------------------
    embedding_provider: EmbeddingProvider = Field(
        default=EmbeddingProvider.pinecone,
        validation_alias="BRH_EMBEDDING_PROVIDER",
    )
    embedding_model: str = Field(
        default="multilingual-e5-large", validation_alias="BRH_EMBEDDING_MODEL"
    )
    embedding_dim: int = Field(default=1024, gt=0, validation_alias="BRH_EMBEDDING_DIM")
    openrouter_embedding_api_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="OPENROUTER_EMBEDDING_API_KEY"
    )
    embedding_context_limit: int | None = Field(
        default=None, gt=0, validation_alias="BRH_EMBEDDING_CONTEXT_LIMIT"
    )
    embedding_batch_size: int = Field(
        default=32, ge=1, le=32, validation_alias="BRH_EMBEDDING_BATCH_SIZE"
    )
    embedding_batch_tokens: int = Field(
        default=16384, gt=0, validation_alias="BRH_EMBEDDING_BATCH_TOKENS"
    )
    embedding_concurrency: int = Field(
        default=2, ge=1, le=8, validation_alias="BRH_EMBEDDING_CONCURRENCY"
    )
    embedding_requests_per_second: float = Field(
        default=1, gt=0, validation_alias="BRH_EMBEDDING_REQUESTS_PER_SECOND"
    )
    ingestion_workers: int = Field(default=1, ge=1, le=16, validation_alias="BRH_INGESTION_WORKERS")

    # --- Vector store (ADR-0003) ---------------------------------------
    pinecone_api_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="BRH_PINECONE_API_KEY"
    )
    pinecone_index_name: str = Field(
        default="brh-intelligence", validation_alias="BRH_PINECONE_INDEX_NAME"
    )
    pinecone_namespace: str = Field(default="default", validation_alias="BRH_PINECONE_NAMESPACE")
    pinecone_text_field: str = Field(
        default="chunk_text", validation_alias="BRH_PINECONE_TEXT_FIELD"
    )
    index_batch_size: int = Field(default=96, ge=1, le=96, validation_alias="BRH_INDEX_BATCH_SIZE")
    index_timeout: float = Field(default=30, gt=0, validation_alias="BRH_INDEX_TIMEOUT")
    index_max_retries: int = Field(default=3, ge=0, validation_alias="BRH_INDEX_MAX_RETRIES")
    embedding_tokenizer: str = Field(
        default="intfloat/multilingual-e5-large", validation_alias="BRH_EMBEDDING_TOKENIZER"
    )
    embedding_tokenizer_revision: str = Field(
        default="main", validation_alias="BRH_EMBEDDING_TOKENIZER_REVISION"
    )
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
    chunk_token_limit: int = Field(default=448, gt=0, validation_alias="BRH_CHUNK_TOKEN_LIMIT")
    chunk_target_tokens: int | None = Field(
        default=None, gt=0, validation_alias="BRH_CHUNK_TARGET_TOKENS"
    )
    chunk_max_tokens: int | None = Field(
        default=None, gt=0, validation_alias="BRH_CHUNK_MAX_TOKENS"
    )
    chunk_token_reserve: int = Field(default=64, ge=0, validation_alias="BRH_CHUNK_TOKEN_RESERVE")
    chunk_tokenizer_id: str = Field(
        default="safe-estimate-v2", validation_alias="BRH_CHUNK_TOKENIZER_ID"
    )

    # --- Web inventory (discovery of brh.ht) ---------------------------
    web_base_url: str = Field(default="https://www.brh.ht", validation_alias="BRH_WEB_BASE_URL")
    web_user_agent: str = Field(
        default="brh-intelligence-inventory/0.1 (+public-sector document inventory)",
        validation_alias="BRH_WEB_USER_AGENT",
    )
    web_request_delay: float = Field(default=0.3, ge=0, validation_alias="BRH_WEB_REQUEST_DELAY")
    web_timeout: float = Field(default=30.0, gt=0, validation_alias="BRH_WEB_TIMEOUT")
    web_max_retries: int = Field(default=3, ge=0, validation_alias="BRH_WEB_MAX_RETRIES")

    # --- Citations -----------------------------------------------------
    public_pdf_base_url: str = Field(
        default="http://localhost:3000/api/pdfs",
        validation_alias="BRH_PUBLIC_PDF_BASE_URL",
    )

    # --- LangGraph Agent Server ----------------------------------------
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
        base = self.data_root.expanduser().resolve() if self.data_root else _data_base()
        object.__setattr__(self, "data_root", base)
        for name in ("raw_dir", "processed_dir", "ocr_dir", "publication_dir"):
            path = Path(getattr(self, name)).expanduser()
            object.__setattr__(self, name, (base / path).resolve())
        return self

    @property
    def model_token_limit(self) -> int:
        known = {"multilingual-e5-large": 512, "qwen/qwen3-embedding-8b": 32768}
        native = known.get(self.embedding_model)
        if self.embedding_context_limit is not None:
            return (
                min(native, self.embedding_context_limit)
                if native
                else self.embedding_context_limit
            )
        if native is None:
            raise ValueError("Unknown embedding model: configure BRH_EMBEDDING_CONTEXT_LIMIT")
        return native

    def validate_chunk_limits(self) -> None:
        ceiling = self.chunk_max_tokens or self.chunk_token_limit
        target = self.chunk_target_tokens or ceiling
        if target > ceiling or ceiling > self.model_token_limit:
            raise ValueError("Require chunk target <= chunk maximum <= embedding context limit")

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
    def resolved_ocr_dir(self) -> Path:
        return Path(self.ocr_dir)

    @property
    def web_store_dir(self) -> Path:
        """Content-addressed store for downloaded web artefacts (under raw_dir)."""
        return self.raw_dir / "web"

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_allowed_origins.split(",") if o.strip()]

    def llm_api_key(self) -> str:
        """The API key for the configured chat provider."""
        if self.llm_provider == LLMProvider.anthropic:
            return self.anthropic_api_key.get_secret_value()
        if self.llm_provider == LLMProvider.openrouter:
            return self.openrouter_api_key.get_secret_value()
        return self.openai_api_key.get_secret_value()

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
