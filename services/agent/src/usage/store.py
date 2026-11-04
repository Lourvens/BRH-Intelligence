"""Persistence for the per-identity daily assistant token ledger."""

from __future__ import annotations

import logging
from datetime import date
from threading import Lock
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)


@runtime_checkable
class UsageStore(Protocol):
    def used(self, identity: str, day: date) -> int:
        """Return the tokens already charged to this identity on this UTC day."""

    def add(
        self,
        identity: str,
        turn_id: str,
        day: date,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        """Append one idempotent usage row for a completed graph turn."""


class MemoryUsageStore:
    """Process-local store for tests and offline graph runs."""

    def __init__(self) -> None:
        self.rows: dict[str, tuple[str, date, int, int]] = {}

    def used(self, identity: str, day: date) -> int:
        return sum(
            input_tokens + output_tokens
            for row_identity, row_day, input_tokens, output_tokens in self.rows.values()
            if row_identity == identity and row_day == day
        )

    def add(
        self,
        identity: str,
        turn_id: str,
        day: date,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        self.rows.setdefault(
            turn_id, (identity, day, max(0, input_tokens), max(0, output_tokens))
        )


class PostgresUsageStore:
    """Postgres-backed store; the pool opens lazily on the first use."""

    def __init__(self) -> None:
        self._pool = None
        self._lock = Lock()

    def _connection_pool(self):
        if self._pool is None:
            with self._lock:
                if self._pool is None:
                    import atexit

                    from brh_core.config import get_settings
                    from brh_core.db.pool import open_pool

                    pool = open_pool(get_settings())
                    pool.open(wait=True)
                    atexit.register(pool.close)
                    self._pool = pool
        return self._pool

    def used(self, identity: str, day: date) -> int:
        with self._connection_pool().connection() as conn:
            row = conn.execute(
                """
                SELECT coalesce(sum(input_tokens + output_tokens), 0) AS total
                FROM corpus.assistant_daily_usage
                WHERE identity = %s AND usage_date = %s
                """,
                (identity, day),
            ).fetchone()
        return int(row["total"]) if row else 0

    def add(
        self,
        identity: str,
        turn_id: str,
        day: date,
        input_tokens: int,
        output_tokens: int,
    ) -> None:
        with self._connection_pool().connection() as conn:
            conn.execute(
                """
                INSERT INTO corpus.assistant_daily_usage (
                    turn_id, identity, usage_date, input_tokens, output_tokens
                ) VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (turn_id) DO NOTHING
                """,
                (turn_id, identity, day, max(0, input_tokens), max(0, output_tokens)),
            )
