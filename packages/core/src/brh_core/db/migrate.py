"""Migration runner.

Applies every ``NNNN_*.sql`` file in :mod:`brh_core.db.migrations` exactly once,
tracked in ``corpus.schema_migrations``. Files are idempotent, so a fresh
database and an existing one converge.

Run with::

    python -m brh_core.db.migrate

TODO: implement. Bootstrap ``corpus.schema_migrations`` first (the SQL files
also create it, but the ledger must exist before we can read applied versions),
then apply each pending file inside a transaction.

``settings`` defaults to ``brh_core.config.get_settings()`` when ``None``.
"""

from __future__ import annotations

from pathlib import Path

from brh_core.config import Settings

MIGRATIONS_DIR = Path(__file__).parent / "migrations"


def apply_migrations(settings: Settings | None = None) -> list[str]:
    """Apply pending migrations; return the versions applied this run."""
    raise NotImplementedError("TODO: bootstrap schema, then apply each pending .sql file")


def main() -> None:
    """CLI entry point."""
    applied = apply_migrations()
    columns = ", ".join(applied) if applied else "none"
    print(f"Applied {len(applied)} migration(s): {columns}")


if __name__ == "__main__":
    main()
