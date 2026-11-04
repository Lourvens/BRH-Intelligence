"""Chat, embedding and vector-store settings."""

from __future__ import annotations

from pydantic import BaseModel, Field, SecretStr

from brh_core.config_base import EmbeddingProvider, LLMProvider, VectorBackend


class LLMSettings(BaseModel):
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

    # Small model for lightweight assistant tasks (titles, future ontology work).
    slm_base_url: str = Field(
        default="https://openrouter.ai/api/v1", min_length=1, validation_alias="BRH_SLM_BASE_URL"
    )
    slm_model: str = Field(
        default="mistralai/ministral-8b-2512", min_length=1, validation_alias="BRH_SLM_MODEL"
    )
    slm_timeout: float = Field(default=20, gt=0, validation_alias="BRH_SLM_TIMEOUT")
    slm_max_tokens: int = Field(default=128, gt=0, validation_alias="BRH_SLM_MAX_TOKENS")

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

    def llm_api_key(self) -> str:
        """The API key for the configured chat provider."""
        if self.llm_provider == LLMProvider.anthropic:
            return self.anthropic_api_key.get_secret_value()
        if self.llm_provider == LLMProvider.openrouter:
            return self.openrouter_api_key.get_secret_value()
        return self.openai_api_key.get_secret_value()
