"""Postgres checkpointer for the Agent Server, portable to Neon.

Neon exposes a pooled PgBouncer endpoint for runtime traffic and a direct
endpoint for schema work. The checkpointer's migrations run on the direct URL;
its query pool uses the pooled URL with prepared statements and implicit
pipelines disabled, which transaction-mode poolers cannot preserve.
"""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from brh_core.config import get_settings
from langgraph.checkpoint.postgres.aio import AsyncPostgresSaver
from psycopg.conninfo import make_conninfo
from psycopg.rows import dict_row
from psycopg_pool import AsyncConnectionPool


def _fallback_url() -> str:
    """Local/container Postgres when Neon URLs are not injected."""
    settings = get_settings()
    return make_conninfo(
        host=settings.postgres_host,
        port=settings.postgres_port,
        dbname=settings.postgres_db,
        user=settings.postgres_user,
        password=settings.postgres_password.get_secret_value(),
        # Keep LangGraph's tables out of the corpus schema.
        options="-csearch_path=public",
    )


def checkpointer_urls() -> tuple[str, str]:
    """Return (runtime, setup) URLs; Neon injects both on its branches."""
    runtime = os.environ.get("DATABASE_URL") or _fallback_url()
    setup = os.environ.get("DATABASE_URL_UNPOOLED") or runtime
    return runtime, setup


@asynccontextmanager
async def create_checkpointer() -> AsyncIterator[AsyncPostgresSaver]:
    """Yield a durable saver for the Agent Server's lifetime."""
    runtime_url, setup_url = checkpointer_urls()

    # DDL belongs on the direct endpoint: PgBouncer transaction pooling is not
    # a safe context for the checkpointer's migrations.
    async with AsyncPostgresSaver.from_conn_string(setup_url) as setup_saver:
        await setup_saver.setup()

    pool = AsyncConnectionPool(
        conninfo=runtime_url,
        min_size=1,
        max_size=4,
        open=False,
        check=AsyncConnectionPool.check_connection,
        kwargs={
            "autocommit": True,
            "row_factory": dict_row,
            # A transaction-mode pooler cannot keep server-side prepared
            # statements on the same backend between transactions.
            "prepare_threshold": None,
        },
    )
    await pool.open()
    try:
        saver = AsyncPostgresSaver(pool)
        # The pooler cannot preserve implicit pipelines across transactions.
        saver.supports_pipeline = False
        yield saver
    finally:
        await pool.close()
