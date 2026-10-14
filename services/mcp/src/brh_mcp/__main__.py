"""MCP server entry point.

Usage::

    python -m brh_mcp                 # streamable HTTP on :8000/mcp
    python -m brh_mcp --transport stdio
"""

from __future__ import annotations

import argparse

from brh_mcp.server import mcp


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="brh_mcp", description="Run the BRH Intelligence MCP server."
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument(
        "--transport",
        default="http",
        choices=["http", "streamable-http", "stdio", "sse"],
    )
    args = parser.parse_args(argv)

    if args.transport in ("http", "streamable-http"):
        mcp.run(transport="http", host=args.host, port=args.port)
    else:
        mcp.run(transport=args.transport)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
