"""Keep a Colab T4 producing documents without being watched.

A free Colab runtime is reclaimed after roughly an hour, and `colab exec` gives
up waiting for a reply after about two minutes — so a human has to notice, make
a new session, install the stack again and restart the chunk. This does that in
a loop instead:

  build the code payload -> new session -> pip install -> upload code ->
  run a 12-document chunk -> pull every couple of minutes -> repeat

Every finished document is merged into `data/ocr`, so a reclaimed runtime costs
the documents since the last pull, not the session.

    setsid nohup uv run python scripts/colab_cycle.py >> /tmp/opencode/colab_cycle.log 2>&1 &
"""

from __future__ import annotations

import base64
import os
import subprocess
import sys
import tarfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SESSION = os.environ.get("SESSION", "ocr-loop")
CHUNK = os.environ.get("CHUNK", "12")
CYCLES = int(os.environ.get("CYCLES", "12"))
PULL_EVERY = int(os.environ.get("PULL_EVERY", "150"))
PAYLOAD = Path("/tmp/opencode/colab_payload.tgz")

ENV = dict(os.environ, OAUTHLIB_RELAX_TOKEN_SCOPE="1")


def log(message: str) -> None:
    print(f"{time.strftime('%H:%M:%SZ', time.gmtime())} {message}", flush=True)


def colab(*args: str, stdin: str | None = None, timeout: int = 180) -> subprocess.CompletedProcess:
    return subprocess.run(
        ["colab", *args], input=stdin, capture_output=True, text=True,
        env=ENV, timeout=timeout, check=False,
    )


def session_alive() -> bool:
    result = colab("status", "-s", SESSION)
    return result.returncode == 0 and "Status:" in result.stdout


def build_payload() -> None:
    """Tar the code plus the current skip list, so each cycle is up to date."""
    with tarfile.open(PAYLOAD, "w:gz") as archive:
        archive.add(ROOT / "packages/core/src/brh_core", arcname="packages/core/src/brh_core")
        for name in ("fetch_shard.py", "merge_ocr.py"):
            archive.add(ROOT / "scripts" / name, arcname=f"scripts/{name}")
        archive.add(ROOT / "data/ocr/urls.jsonl", arcname="data/ocr/urls.jsonl")
        archive.add(ROOT / "data/ocr/done_shas.txt", arcname="data/ocr/done_shas.txt")


def upload() -> bool:
    payload = base64.b64encode(PAYLOAD.read_bytes()).decode()
    script = (
        "import base64, pathlib, subprocess\n"
        f"pathlib.Path('/content/code.tgz').write_bytes(base64.b64decode('{payload}'))\n"
        "pathlib.Path('/content/repo').mkdir(parents=True, exist_ok=True)\n"
        "subprocess.run(['tar', 'xzf', '/content/code.tgz', '-C', '/content/repo'], check=True)\n"
        "print('uploaded')\n"
    )
    return "uploaded" in colab("exec", "-s", SESSION, stdin=script, timeout=300).stdout


def install() -> bool:
    script = (
        "import subprocess, sys\n"
        "subprocess.Popen([sys.executable, '-m', 'pip', 'install', '-q', '-U',\n"
        "  'paddleocr[doc-parser]', 'transformers>=5.0.0', 'pymupdf', 'pydantic',\n"
        "  'pydantic-settings'], stdout=open('/content/i.log','wb'),\n"
        "  stderr=subprocess.STDOUT, start_new_session=True)\n"
        "print('installing')\n"
    )
    colab("exec", "-s", SESSION, stdin=script)
    for _ in range(20):
        time.sleep(30)
        probe = colab(
            "exec", "-s", SESSION,
            stdin=(
                "import importlib.util; "
                "print('READY' if importlib.util.find_spec('paddleocr') else 'WAIT')\n"
            ),
        )
        if "READY" in probe.stdout:
            return True
        if not session_alive():
            return False
    return False


def start_chunk() -> None:
    script = (
        "import subprocess, sys\n"
        "subprocess.Popen([sys.executable, '-u', '/content/chunk.py'],\n"
        "  stdout=open('/content/colab_run.log','wb'), stderr=subprocess.STDOUT,\n"
        "  start_new_session=True)\n"
        "print('chunk started')\n"
    )
    colab("exec", "-s", SESSION, stdin=script)


def running() -> bool:
    probe = colab(
        "exec", "-s", SESSION,
        stdin=(
            "import subprocess; "
            "print('RUN' if subprocess.run('pgrep -f /content/chunk.py >/dev/null', "
            "shell=True).returncode == 0 else 'DONE')\n"
        ),
    )
    return "RUN" in probe.stdout


def pull() -> None:
    subprocess.run(["bash", str(ROOT / "scripts/colab-pull.sh"), SESSION], check=False)


def main() -> int:
    chunk_source = Path("/tmp/opencode/colab_chunk.py").read_text()
    for cycle in range(1, CYCLES + 1):
        log(f"cycle {cycle}: starting {SESSION}")
        subprocess.run(["colab", "stop", "-s", SESSION], env=ENV, capture_output=True)
        if colab("new", "-s", SESSION, "--gpu", "T4", timeout=300).returncode != 0:
            log("could not create a session; waiting")
            time.sleep(120)
            continue

        if not install():
            log("install failed or session lost")
            continue

        build_payload()
        if not upload():
            log("upload failed")
            continue

        encoded = base64.b64encode(chunk_source.encode()).decode()
        colab(
            "exec", "-s", SESSION,
            stdin=(
                "import base64, pathlib; "
                f"pathlib.Path('/content/chunk.py').write_bytes(base64.b64decode('{encoded}')); "
                "print('chunk ready')\n"
            ),
        )
        start_chunk()
        log("chunk started")

        while session_alive() and running():
            time.sleep(PULL_EVERY)
            pull()
        pull()
        log("cycle finished or session lost")
    return 0


if __name__ == "__main__":
    sys.exit(main())
