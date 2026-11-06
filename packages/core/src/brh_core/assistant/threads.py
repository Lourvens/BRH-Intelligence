"""Durable index of assistant conversations.

The conversation state itself lives in the Postgres checkpointer. This
repository only stores what the Agent Server's in-memory runtime forgets: which
conversations exist, for which browser, and under which title.
"""

from __future__ import annotations

OWNER_MAX_LENGTH = 128
TITLE_MAX_LENGTH = 120
DEFAULT_TITLE = "Conversation"
LIST_LIMIT_MAX = 100

_COLUMNS = "thread_id, title, created_at, updated_at"


class AssistantThreadRepository:
    """Owner-scoped CRUD over ``corpus.assistant_threads``."""

    def __init__(self, pool):
        self.pool = pool

    def list(self, owner: str, limit: int = 50) -> list[dict]:
        bounded = max(1, min(limit, LIST_LIMIT_MAX))
        with self.pool.connection() as conn:
            rows = conn.execute(
                f"""SELECT {_COLUMNS} FROM corpus.assistant_threads
                    WHERE owner=%s ORDER BY updated_at DESC LIMIT %s""",
                (owner, bounded),
            ).fetchall()
        return [dict(row) for row in rows]

    def get(self, thread_id: str, owner: str) -> dict | None:
        with self.pool.connection() as conn:
            row = conn.execute(
                f"""SELECT {_COLUMNS} FROM corpus.assistant_threads
                    WHERE thread_id=%s AND owner=%s""",
                (thread_id, owner),
            ).fetchone()
        return dict(row) if row else None

    def upsert(self, thread_id: str, owner: str, title: str) -> dict | None:
        """Insert or rename a thread; a different owner keeps its row untouched."""
        normalized = (title or "").strip()[:TITLE_MAX_LENGTH] or DEFAULT_TITLE
        with self.pool.connection() as conn, conn.transaction():
            row = conn.execute(
                f"""INSERT INTO corpus.assistant_threads (thread_id, owner, title)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (thread_id) DO UPDATE
                      SET title=EXCLUDED.title, updated_at=now()
                      WHERE corpus.assistant_threads.owner=EXCLUDED.owner
                    RETURNING {_COLUMNS}""",
                (thread_id, owner, normalized),
            ).fetchone()
        return dict(row) if row else None

    def delete(self, thread_id: str, owner: str) -> bool:
        with self.pool.connection() as conn, conn.transaction():
            row = conn.execute(
                """DELETE FROM corpus.assistant_threads
                   WHERE thread_id=%s AND owner=%s RETURNING thread_id""",
                (thread_id, owner),
            ).fetchone()
        return row is not None
