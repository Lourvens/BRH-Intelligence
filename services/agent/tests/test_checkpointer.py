"""Integration test for the custom Postgres checkpointer."""

import os
import uuid

import pytest
from brh_agent.persistence.checkpointer import create_checkpointer
from brh_core.config import get_settings
from psycopg import OperationalError, connect, sql
from psycopg.conninfo import make_conninfo

pytestmark = pytest.mark.integration


def base_dsn() -> str:
    # Schema setup needs a direct connection: Neon's pooler rejects startup
    # options, and this test pins a throwaway search_path.
    return os.environ.get("BRH_TEST_POSTGRES_DSN") or get_settings().postgres_migration_dsn


@pytest.mark.asyncio
async def test_checkpointer_persists_across_connections(monkeypatch):
    base = base_dsn()
    schema = f"checkpoint_test_{uuid.uuid4().hex[:8]}"
    try:
        with connect(base, autocommit=True, connect_timeout=2) as conn:
            conn.execute(sql.SQL("CREATE SCHEMA {}").format(sql.Identifier(schema)))
    except OperationalError:
        pytest.skip("Postgres is not available for the checkpointer integration test")

    dsn = make_conninfo(base, options=f"-csearch_path={schema},public")
    monkeypatch.setenv("DATABASE_URL", dsn)
    monkeypatch.setenv("DATABASE_URL_UNPOOLED", dsn)
    checkpoint = {
        "v": 4,
        "ts": "2026-11-03T00:00:00+00:00",
        "id": str(uuid.uuid4()),
        "channel_values": {"my_key": "meow"},
        "channel_versions": {"__start__": 2, "my_key": 3},
        "versions_seen": {"__start__": {"__start__": 1}},
    }
    config = {"configurable": {"thread_id": "thread-1", "checkpoint_ns": ""}}
    try:
        async with create_checkpointer() as saver:
            await saver.aput(config, checkpoint, {}, {})

        async with create_checkpointer() as saver:
            found = await saver.aget_tuple(
                {"configurable": {"thread_id": "thread-1"}}
            )
            assert found is not None
            assert found.checkpoint["channel_values"]["my_key"] == "meow"
    finally:
        with connect(base, autocommit=True) as conn:
            conn.execute(
                sql.SQL("DROP SCHEMA {} CASCADE").format(sql.Identifier(schema))
            )
