"""Deploy the Python agent + corpus service to Modal.

One container serves the LangGraph API (``/threads``, ``/runs``) and the
research routes (``/corpus/v1/*``) from ``services/agent``. Neon Postgres holds
checkpoints and the corpus; Neon Object Storage holds published artifacts.

    uvx --with python-dotenv modal deploy scripts/modal_agent.py
    uvx --with python-dotenv modal run scripts/modal_agent.py::sync_corpus
    uvx --with python-dotenv modal run scripts/modal_agent.py::upload_pdfs
    uvx modal app logs brh-intelligence-agent
"""

from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

import modal

ROOT = Path(__file__).resolve().parent.parent
REMOTE_ROOT = "/app"

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("git")
    .pip_install("uv==0.10.6")
    .add_local_file(ROOT / "pyproject.toml", f"{REMOTE_ROOT}/pyproject.toml", copy=True)
    .add_local_file(ROOT / "uv.lock", f"{REMOTE_ROOT}/uv.lock", copy=True)
    .add_local_file(ROOT / "README.md", f"{REMOTE_ROOT}/README.md", copy=True)
    .add_local_dir(
        ROOT / "packages",
        f"{REMOTE_ROOT}/packages",
        copy=True,
        ignore=["**/__pycache__", "**/*.pyc", "**/.pytest_cache", "**/.ruff_cache"],
    )
    .add_local_dir(
        ROOT / "services",
        f"{REMOTE_ROOT}/services",
        copy=True,
        ignore=["**/__pycache__", "**/*.pyc", "**/.pytest_cache", "**/.langgraph_api"],
    )
    .add_local_dir(
        ROOT / "scripts",
        f"{REMOTE_ROOT}/scripts",
        copy=True,
        ignore=["**/__pycache__", "**/*.pyc"],
    )
    .run_commands(
        "cd /app && uv sync --frozen --all-packages --group dev "
        "--no-install-package brh-analytics --no-install-package brh-mcp"
    )
)

app = modal.App("brh-intelligence-agent")
ocr_volume = modal.Volume.from_name("brh-ocr", create_if_missing=True)


@app.function(
    image=image,
    secrets=[modal.Secret.from_dotenv(ROOT / ".env")],
    volumes={"/data": ocr_volume},
    timeout=3600,
)
def upload_pdfs():
    """Publish source PDFs at ``<slug>.pdf`` so citation deep links resolve."""
    env = os.environ.copy()
    env["BRH_ENV"] = "production"
    env["BRH_PDF_ROOT"] = "/data/pdfs"
    env["VIRTUAL_ENV"] = f"{REMOTE_ROOT}/.venv"
    env["PATH"] = f"{REMOTE_ROOT}/.venv/bin:" + env.get("PATH", "")
    subprocess.run(
        [f"{REMOTE_ROOT}/.venv/bin/python", f"{REMOTE_ROOT}/scripts/upload_pdfs.py"],
        cwd=REMOTE_ROOT,
        env=env,
        check=True,
    )


@app.function(
    image=image,
    secrets=[modal.Secret.from_dotenv(ROOT / ".env")],
    volumes={"/data": ocr_volume},
    timeout=3600,
)
def sync_corpus():
    """Publish OCR bundles from the shared volume into Neon Object Storage."""
    env = os.environ.copy()
    env["BRH_ENV"] = "production"
    env["BRH_OCR_DIR"] = "/data/ocr"
    env["VIRTUAL_ENV"] = f"{REMOTE_ROOT}/.venv"
    env["PATH"] = f"{REMOTE_ROOT}/.venv/bin:" + env.get("PATH", "")
    subprocess.run(
        [
            f"{REMOTE_ROOT}/.venv/bin/python",
            "-m",
            "brh_core.corpus",
            "sync",
            "--workers",
            "8",
        ],
        cwd=REMOTE_ROOT,
        env=env,
        check=True,
    )


@app.function(
    image=image,
    secrets=[modal.Secret.from_dotenv(ROOT / ".env")],
    max_containers=1,
    scaledown_window=300,
    timeout=3600,
)
@modal.web_server(port=8000, startup_timeout=240)
def serve():
    env = os.environ.copy()
    env["BRH_ENV"] = "production"
    env["VIRTUAL_ENV"] = f"{REMOTE_ROOT}/.venv"
    env["PATH"] = f"{REMOTE_ROOT}/.venv/bin:" + env.get("PATH", "")
    # The image has no .env file; every variable arrives through the Modal
    # secret above. langgraph.json's relative env path is simply absent.
    process = subprocess.Popen(
        [
            f"{REMOTE_ROOT}/.venv/bin/langgraph",
            "dev",
            "--host",
            "0.0.0.0",
            "--port",
            "8000",
            "--no-browser",
            "--no-reload",
        ],
        cwd=f"{REMOTE_ROOT}/services/agent",
        env=env,
        stdout=sys.stdout,
        stderr=sys.stderr,
        start_new_session=True,
    )
    print(f"agent server started pid={process.pid}", flush=True)
