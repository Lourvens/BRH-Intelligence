"""BRH Intelligence MCP server (ADR-0007).

Exposes the shared retrieval core to MCP clients so other developers' agents
can ground on the same trusted BRH documents our product uses.
"""

from brh_mcp.server import create_server, mcp

__all__ = ["create_server", "mcp"]
