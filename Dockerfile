# BRH Intelligence backend image.
#
# One process serves both surfaces the web app needs:
#   - the LangGraph agent API (/threads, /runs, streaming) from langgraph.json
#   - the research corpus routes (/corpus/v1/*) from brh_agent.api.app
#
# The LangGraph Agent Server in this image is the in-memory dev server. It is
# suitable for a demo deployment; production needs a licensed Agent Server,
# PostgreSQL for checkpoints and Redis for pub/sub (see the runbook).
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.10.6 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_HTTP_TIMEOUT=120 \
    UV_HTTP_RETRIES=5 \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# The uv workspace resolves brh-core, brh-agent, brh-mcp and brh-analytics from
# source, so copy every member before syncing the frozen lockfile.
COPY pyproject.toml uv.lock ./
COPY packages ./packages
COPY services ./services

# Analytics and MCP are workspace members but not part of this service; skip
# their packages (and Streamlit/matplotlib) to keep the image small.
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-packages \
      --no-install-package brh-analytics \
      --no-install-package brh-mcp

WORKDIR /app/services/agent

EXPOSE 8000

# 0.0.0.0 is required: Fly routes to the Machine, not to its loopback.
CMD ["langgraph", "dev", "--host", "0.0.0.0", "--port", "8000", "--no-browser", "--no-reload"]
