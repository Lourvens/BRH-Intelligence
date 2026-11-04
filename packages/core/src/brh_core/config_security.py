"""CORS, request-limit and thread-context settings."""

from __future__ import annotations

from pydantic import BaseModel, Field, SecretStr


class SecuritySettings(BaseModel):
    cors_allowed_origins: str = Field(
        default="http://localhost:3000",
        validation_alias="BRH_CORS_ALLOWED_ORIGINS",
    )
    rate_limit_enabled: bool = Field(
        default=True, validation_alias="BRH_RATE_LIMIT_ENABLED"
    )
    rate_limit_window_seconds: int = Field(
        default=60, gt=0, validation_alias="BRH_RATE_LIMIT_WINDOW_SECONDS"
    )
    rate_limit_trust_proxy: bool = Field(
        default=False, validation_alias="BRH_RATE_LIMIT_TRUST_PROXY"
    )
    rate_limit_global_requests: int = Field(
        default=600, ge=1, validation_alias="BRH_RATE_LIMIT_GLOBAL_REQUESTS"
    )
    rate_limit_agent_requests: int = Field(
        default=120, ge=1, validation_alias="BRH_RATE_LIMIT_AGENT_REQUESTS"
    )
    rate_limit_agent_runs: int = Field(
        default=6, ge=1, validation_alias="BRH_RATE_LIMIT_AGENT_RUNS"
    )
    rate_limit_corpus_requests: int = Field(
        default=120, ge=1, validation_alias="BRH_RATE_LIMIT_CORPUS_REQUESTS"
    )
    rate_limit_search_requests: int = Field(
        default=10, ge=1, validation_alias="BRH_RATE_LIMIT_SEARCH_REQUESTS"
    )
    agent_max_context_tokens: int = Field(
        default=12000, gt=0, validation_alias="BRH_AGENT_MAX_CONTEXT_TOKENS"
    )
    agent_max_context_messages: int = Field(
        default=40, gt=0, validation_alias="BRH_AGENT_MAX_CONTEXT_MESSAGES"
    )
    # 0 disables the daily assistant token quota. The window is the UTC day.
    agent_daily_token_limit: int = Field(
        default=0, ge=0, validation_alias="BRH_AGENT_DAILY_TOKEN_LIMIT"
    )
    # HMAC key for turning a client address into a non-reversible quota identity.
    # Set a deployment-specific value; changing it resets all daily counters.
    quota_identity_salt: SecretStr = Field(
        default=SecretStr("brh-intelligence"),
        validation_alias="BRH_QUOTA_IDENTITY_SALT",
    )

    @property
    def cors_allowed_origins_list(self) -> list[str]:
        return [
            origin.rstrip("/")
            for origin in (item.strip() for item in self.cors_allowed_origins.split(","))
            if origin
        ]
