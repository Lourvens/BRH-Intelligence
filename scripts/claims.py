"""Atomic per-document claims, so two runners never OCR the same bytes.

A skip list is a snapshot. Two runners that read it a minute apart can both
decide a document is unclaimed, and both spend GPU time on it. A claim is
atomic: exactly one insert wins, the loser moves on.

The backend is MongoDB (Atlas M0 is free and always on, unlike a laptop). The
collection is keyed by `sha256`, so a claim is about the document, not the URL
that happened to reach it. A TTL index expires abandoned claims by itself: a
runner that dies mid-document does not block it forever.

Two deliberate choices:

- **No URI means no coordination.** The runners fall back to the skip list, which
  is what they did before. Nothing has to be provisioned to keep extracting.
- **Fail open.** If the database is unreachable, `claim` returns True. A
  duplicate costs minutes of free GPU; refusing to work costs the whole run.
"""

from __future__ import annotations

import contextlib
import os
from datetime import UTC, datetime

DEFAULT_TTL_SECONDS = 6 * 3600


class Claims:
    """A claim is `insert` on `_id = sha256`; the loser gets a duplicate key."""

    def __init__(
        self,
        uri: str | None = None,
        runner: str | None = None,
        ttl_seconds: int = DEFAULT_TTL_SECONDS,
    ) -> None:
        self.uri = uri or os.environ.get("BRH_CLAIMS_URI", "")
        self.runner = runner or os.environ.get("BRH_RUNNER", "unknown")
        self.ttl_seconds = ttl_seconds
        self._collection = None
        if self.uri:
            self._connect(ttl_seconds)

    @property
    def enabled(self) -> bool:
        return self._collection is not None

    def _connect(self, ttl_seconds: int) -> None:
        try:
            from pymongo import MongoClient

            client = MongoClient(self.uri, serverSelectionTimeoutMS=3000)
            client.admin.command("ping")
            collection = client.get_default_database()["claims"]
            collection.create_index("at", expireAfterSeconds=ttl_seconds)
            self._collection = collection
        except Exception as error:  # degrade to the skip list
            print(f"claims disabled: {error}", flush=True)
            self._collection = None

    def claim(self, sha256: str) -> bool:
        """True when this runner owns the document (or coordination is off)."""
        if self._collection is None:
            return True
        try:
            self._collection.insert_one(
                {"_id": sha256, "runner": self.runner, "at": datetime.now(UTC)}
            )
            return True
        except Exception as error:
            if type(error).__name__ == "DuplicateKeyError":
                return False
            print(f"claim failed for {sha256[:8]}: {error}", flush=True)
            return True

    def release(self, sha256: str) -> None:
        """Give a failed document back instead of waiting for the TTL."""
        if self._collection is None:
            return
        with contextlib.suppress(Exception):  # the TTL will clean it up
            self._collection.delete_one({"_id": sha256})
