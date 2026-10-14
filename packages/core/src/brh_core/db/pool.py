"""Connection-pool helpers for the corpus database.

TODO: implement ``open_pool`` on top of ``psycopg_pool.ConnectionPool``. Keep
it lazy (``open=False``) and pass the search path through ``settings.postgres_dsn``.
"""

from __future__ import annotations

from psycopg_pool import ConnectionPool

from brh_core.config import Settings


def open_pool(settings: Settings) -> ConnectionPool:
    """Open a connection pool against the corpus database.

    The pool should be lazy: no connection until the first ``connection()``
    call. Autocommit is fine for the ingestion workload.
    """
    raise NotImplementedError("TODO: build a ConnectionPool from settings")
