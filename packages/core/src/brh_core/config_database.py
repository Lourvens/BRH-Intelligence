"""Postgres/Neon connection settings and DSN construction."""

from __future__ import annotations

from psycopg.conninfo import make_conninfo
from pydantic import BaseModel, Field, SecretStr


class DatabaseSettings(BaseModel):
    # Neon injects these standard URLs. The pooled URL serves runtime traffic;
    # migrations must use the direct URL because PgBouncer transaction pooling
    # cannot hold the DDL session state.
    database_url: SecretStr = Field(default=SecretStr(""), validation_alias="DATABASE_URL")
    database_url_unpooled: SecretStr = Field(
        default=SecretStr(""), validation_alias="DATABASE_URL_UNPOOLED"
    )
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

    def _url_dsn(self, url: str) -> str:
        """Pin the corpus schema onto a direct Neon connection URL."""
        return make_conninfo(url, options=f"-csearch_path={self.postgres_schema},public")

    @property
    def postgres_dsn(self) -> str:
        """Runtime connection string.

        The pooled URL deliberately carries no startup ``options``: PgBouncer
        rejects ``search_path`` there. ``open_pool`` applies it per session.
        """
        url = self.database_url.get_secret_value()
        if url:
            return url
        password = self.postgres_password.get_secret_value()
        return (
            f"host={self.postgres_host} port={self.postgres_port} "
            f"dbname={self.postgres_db} user={self.postgres_user} "
            f"password={password} options=-csearch_path={self.postgres_schema},public"
        )

    @property
    def postgres_migration_dsn(self) -> str:
        """DDL connection string; a direct URL bypasses the transaction pooler."""
        url = self.database_url_unpooled.get_secret_value() or self.database_url.get_secret_value()
        return self._url_dsn(url) if url else self.postgres_dsn

    @property
    def uses_neon_urls(self) -> bool:
        return bool(self.database_url.get_secret_value())
