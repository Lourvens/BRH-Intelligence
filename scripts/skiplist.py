"""The published skip list, read before every document.

A runner's local copy is a snapshot from when its chunk or kernel started: hours
old by the time the last document is reached. The repository is public, so
`git push` already publishes the list at a raw URL — reading it costs an
outbound GET and needs no coordination service, no tunnel and no credentials.

MongoDB claims (see `claims.py`) are the stricter layer on top: they make the
check atomic. This module alone leaves a window of one push-plus-CDN cycle,
which is minutes, not hours.
"""

from __future__ import annotations

import urllib.request
from pathlib import Path

REMOTE = "https://raw.githubusercontent.com/Lourvens/BRH-Intelligence/main/data/ocr/done_shas.txt"


def local(path: str | Path) -> set[str]:
    try:
        with open(path, encoding="utf-8") as handle:
            return {line.strip() for line in handle if line.strip()}
    except FileNotFoundError:
        return set()


def remote(url: str = REMOTE, timeout: int = 15) -> set[str]:
    """Empty when offline or rate limited: the local copy still applies."""
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return {line.strip() for line in response.read().decode().splitlines() if line.strip()}
    except Exception:  # a failed fetch must not stop extraction
        return set()


def published(path: str | Path) -> set[str]:
    """Union of the local snapshot and the live list."""
    return local(path) | remote()
