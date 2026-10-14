"""BRH Intelligence core.

Shared domain model, storage adapters, ingestion, and retrieval for every
surface of the platform (agent, MCP server, web API). See ``docs/adr`` for the
reasoning behind each piece.
"""

from brh_core.config import Settings, get_settings

__all__ = ["Settings", "get_settings"]
