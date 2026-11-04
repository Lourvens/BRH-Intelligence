"""Connection-pool helpers for the corpus database."""

from __future__ import annotations

from psycopg import sql
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from brh_core.config import Settings


def open_pool(settings: Settings) -> ConnectionPool:
    """Build a lazy connection pool against the corpus database.

    No connection is opened until the first ``connection()`` call. Autocommit
    suits the pipeline's single-statement writes; the schema is pinned through
    ``settings.postgres_dsn``; ``dict_row`` keeps rows addressable by name.
    """
    def set_search_path(conn) -> None:
        # Neon's transaction pooler rejects search_path in startup options,
        # so pin it on each pooled session instead.
        conn.execute(
            sql.SQL("SET search_path TO {}, public").format(
                sql.Identifier(settings.postgres_schema)
            )
        )

    return ConnectionPool(
        conninfo=settings.postgres_dsn,
        min_size=settings.postgres_pool_min_size,
        max_size=settings.postgres_pool_max_size,
        open=False,
        configure=set_search_path,
        kwargs={
            "autocommit": True,
            "row_factory": dict_row,
            # A transaction-mode pooler (Neon/PgBouncer) cannot keep a
            # server-side prepared statement on one backend between transactions.
            "prepare_threshold": None,
        },
    )
