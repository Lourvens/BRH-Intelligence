"""Migration runner.

Applies every ``NNNN_*.sql`` file in :mod:`brh_core.db.migrations` exactly once,
tracked in ``corpus.schema_migrations``. Files are idempotent, so a fresh
database and an existing one converge.

Run with::

    python -m brh_core.db.migrate
"""

from __future__ import annotations

from pathlib import Path

import psycopg
from psycopg.rows import dict_row

from brh_core.config import Settings, get_settings

MIGRATIONS_DIR = Path(__file__).parent / "migrations"

_BOOTSTRAP = """
CREATE SCHEMA IF NOT EXISTS corpus;
CREATE TABLE IF NOT EXISTS corpus.schema_migrations (
    version    TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def apply_migrations(settings: Settings | None = None) -> list[str]:
    """Apply pending migrations; return the versions applied this run.

    Each file is executed as one script in its own transaction; the version row
    is written in the same transaction, so a failure leaves nothing half-applied.
    """
    settings = settings or get_settings()
    applied: list[str] = []

    with psycopg.connect(settings.postgres_dsn, autocommit=False, row_factory=dict_row) as conn:
        conn.execute(_BOOTSTRAP)
        conn.commit()

        done = {
            row["version"]
            for row in conn.execute("SELECT version FROM corpus.schema_migrations").fetchall()
        }

        for path in sorted(MIGRATIONS_DIR.glob("*.sql")):
            version = path.stem
            if version in done:
                continue
            conn.execute(path.read_text(encoding="utf-8"))
            conn.execute(
                "INSERT INTO corpus.schema_migrations (version) VALUES (%s)", (version,)
            )
            conn.commit()
            applied.append(version)

    return applied


def main() -> None:
    """CLI entry point."""
    applied = apply_migrations()
    columns = ", ".join(applied) if applied else "none"
    print(f"Applied {len(applied)} migration(s): {columns}")


if __name__ == "__main__":
    main()
