"""Database access layer.

Raw SQL on ``psycopg`` 3. We deliberately do not add an ORM: the schema is a
handful of tables and the value is in explicit, testable statements
(ADR-0003).
"""

from brh_core.db.pool import open_pool
from brh_core.db.repository import CorpusRepository

__all__ = ["CorpusRepository", "open_pool"]
