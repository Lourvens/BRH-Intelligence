.PHONY: help install sync postgres-up postgres-down migrate ingest inventory ocr-pull analytics analytics-dev agent-dev mcp-dev web-dev test lint fmt check seed lab

# Modal is a runner dependency, not a workspace one; point this at whatever
# environment has the CLI (e.g. MODAL="/path/to/venv/bin/python -m modal").
MODAL ?= python -m modal

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: sync ## Sync Python env, install JS deps
	bun install

sync: ## Create/update the uv workspace virtualenv
	uv sync --all-packages

postgres-up: ## Start Postgres (metadata store)
	docker compose up -d postgres

postgres-down: ## Stop Postgres
	docker compose down

migrate: ## Apply the corpus schema
	uv run python -m brh_core.db.migrate

seed: ## Copy the sibling project's PDFs + parsed Markdown into data/
	./scripts/seed-data.sh

ingest: ## Discover PDFs in data/raw and run the ingestion pipeline
	uv run python -m brh_core.ingestion $(ARGS)

inventory: ## Catalogue brh.ht and download the missing documents (ARGS="--limit 20")
	uv run python -m brh_core.inventory $(ARGS)

ocr-pull: ## Pull Modal's OCR output into data/ocr — a volume is not a backup
	rm -rf /tmp/brh-ocr-pull
	$(MODAL) volume get brh-ocr /ocr /tmp/brh-ocr-pull --force
	uv run python scripts/merge_ocr.py --from /tmp/brh-ocr-pull/ocr --into data/ocr
	uv run python scripts/verify_ocr.py

analytics: ## Render the posts into services/analytics/out (ARGS="--size portrait")
	uv run python -m brh_analytics $(ARGS)

analytics-dev: ## Open the analytics dashboard
	uv run streamlit run services/analytics/src/brh_analytics/app.py

agent-dev: ## Run the LangGraph agent server locally
	cd services/agent && uv run langgraph dev

mcp-dev: ## Run the MCP server (streamable HTTP)
	uv run python -m brh_mcp

web-dev: ## Run the Next.js app
	cd apps/web && bun dev

lab: ## Open JupyterLab for experiments (syncs its env first)
	cd experiments && uv sync && uv run jupyter lab notebooks

test: ## Run the Python test suite
	uv run pytest

lint: ## Lint Python + TypeScript
	uv run ruff check .
	cd apps/web && bun run lint

fmt: ## Format Python
	uv run ruff format .

check: lint test ## Lint + test
