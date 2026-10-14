"""MCP tools over :class:`brh_core.retrieval.RetrievalService` (ADR-0007).

Every tool should return plain JSON-serializable structures. The retrieval
service should be built lazily so importing this module performs no network I/O.

TODO: register the tools. Suggested surface:

* ``search_documents(query, top_k)`` -> grounded passages + citations
* ``list_documents()``               -> the corpus inventory
* ``get_document(identifier)``       -> metadata by id or slug
* ``get_page(identifier, page)``     -> page text (1-based)
* ``corpus_stats()``                 -> documents / pages / chunks

Each is a plain function decorated with ``@mcp.tool``. Keep it thin: delegate to
``RetrievalService`` and shape the JSON.
"""

from __future__ import annotations

from fastmcp import FastMCP

SERVER_NAME = "BRH Intelligence"
SERVER_INSTRUCTIONS = (
    "Recherche et consultation des publications officielles de la Banque de "
    "la République d'Haïti (BRH). Les réponses sont ancrées dans les "
    "documents et citent la page exacte."
)


def create_server() -> FastMCP:
    """Build the MCP server.

    ``service`` is intentionally not a parameter yet — add an injectable
    dependency when you implement the tools (it makes them unit-testable).
    """
    mcp = FastMCP(name=SERVER_NAME, instructions=SERVER_INSTRUCTIONS)

    # Example (uncomment and implement):
    #
    # @mcp.tool
    # def search_documents(query: str, top_k: int = 5) -> dict:
    #     """Search BRH publications and return grounded passages with citations."""
    #     ...

    return mcp


mcp = create_server()
