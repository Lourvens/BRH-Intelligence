"""Retrieval, source-discovery and public link settings."""

from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievalSettings(BaseModel):
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

    # --- Citations and Agent Server URLs -------------------------------
    public_pdf_base_url: str = Field(
        default="http://localhost:3000/api/pdfs",
        validation_alias="BRH_PUBLIC_PDF_BASE_URL",
    )
    langgraph_url: str = Field(
        default="http://localhost:2024", validation_alias="BRH_LANGGRAPH_URL"
    )
    langgraph_assistant_id: str = Field(
        default="agent", validation_alias="BRH_LANGGRAPH_ASSISTANT_ID"
    )
