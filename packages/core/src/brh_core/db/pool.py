"""Connection-pool helpers for the corpus database."""

from __future__ import annotations

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from brh_core.config import Settings


def open_pool(settings: Settings) -> ConnectionPool:
    """Build a lazy connection pool against the corpus database.

    No connection is opened until the first ``connection()`` call. Autocommit
    suits the pipeline's single-statement writes; the schema is pinned through
    ``settings.postgres_dsn``; ``dict_row`` keeps rows addressable by name.
    """
    return ConnectionPool(
        conninfo=settings.postgres_dsn,
        min_size=settings.postgres_pool_min_size,
        max_size=settings.postgres_pool_max_size,
        open=False,
        kwargs={"autocommit": True, "row_factory": dict_row},
    )
