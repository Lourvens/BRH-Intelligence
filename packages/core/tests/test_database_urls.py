"""Neon-style URLs: pooled for runtime, direct for schema migrations."""

from brh_core.config import Settings


def test_neon_urls_split_runtime_and_migrations(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://brh:secret@pooled.example/brh?sslmode=require"
    )
    monkeypatch.setenv(
        "DATABASE_URL_UNPOOLED", "postgresql://brh:secret@direct.example/brh?sslmode=require"
    )

    settings = Settings(_env_file=None)

    assert "pooled.example" in settings.postgres_dsn
    assert "options" not in settings.postgres_dsn
    assert "direct.example" in settings.postgres_migration_dsn
    assert "search_path=corpus,public" in settings.postgres_migration_dsn
    assert settings.uses_neon_urls is True


def test_local_postgres_remains_the_fallback(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DATABASE_URL_UNPOOLED", raising=False)

    settings = Settings(_env_file=None)

    assert "host=localhost" in settings.postgres_dsn
    assert settings.postgres_migration_dsn == settings.postgres_dsn
    assert settings.uses_neon_urls is False
