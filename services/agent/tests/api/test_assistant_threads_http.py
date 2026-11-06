"""Offline contracts for the durable conversation index."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from brh_core.config import Settings
from starlette.testclient import TestClient

from api.app import create_app
from api.routes import assistant_threads as routes

OWNER = "abcdef0123456789abcdef"
OTHER = "999999012345678999999"
HEADERS = {"X-Assistant-Owner": OWNER}
THREAD_ID = "01a1a447-47a1-7c01-a0f3-60e854eef4f7"


class FakeThreads:
    def __init__(self):
        self.rows = {}

    @staticmethod
    def _public(row):
        return {key: row[key] for key in ("thread_id", "title", "created_at", "updated_at")}

    def list(self, owner, limit=50):
        owned = [row for row in self.rows.values() if row["owner"] == owner]
        return [self._public(row) for row in owned[-limit:]]

    def get(self, thread_id, owner):
        row = self.rows.get(thread_id)
        return self._public(row) if row and row["owner"] == owner else None

    def upsert(self, thread_id, owner, title):
        row = self.rows.get(thread_id)
        if row is not None and row["owner"] != owner:
            return None
        now = datetime.now(UTC)
        row = {
            "thread_id": thread_id,
            "owner": owner,
            "title": title.strip()[:120],
            "created_at": row["created_at"] if row else now,
            "updated_at": now,
        }
        self.rows[thread_id] = row
        return self._public(row)

    def delete(self, thread_id, owner):
        row = self.rows.get(thread_id)
        if row is None or row["owner"] != owner:
            return False
        del self.rows[thread_id]
        return True


class FakeRetrieval:
    def corpus_stats(self):
        return {"readable_documents": 0}


def client_for(threads):
    settings = Settings(_env_file=None, rate_limit_enabled=False)
    return TestClient(create_app(FakeRetrieval(), FakeThreads(), settings, thread_store=threads))


def test_the_index_requires_a_browser_owner():
    store = FakeThreads()
    with client_for(store) as client:
        assert client.get("/assistant/v1/threads").status_code == 401
        assert (
            client.get("/assistant/v1/threads", headers={"X-Assistant-Owner": "short"}).status_code
            == 401
        )
        assert (
            client.put(
                f"/assistant/v1/threads/{THREAD_ID}", json={"title": "Test"}
            ).status_code
            == 401
        )


def test_save_list_and_delete_are_owner_scoped():
    store = FakeThreads()
    with client_for(store) as client:
        saved = client.put(
            f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS, json={"title": "Inflation"}
        )
        assert saved.status_code == 200
        assert saved.json()["title"] == "Inflation"
        assert saved.headers["cache-control"] == "no-store"

        listing = client.get("/assistant/v1/threads", headers=HEADERS)
        assert listing.status_code == 200
        assert [row["thread_id"] for row in listing.json()["items"]] == [THREAD_ID]
        assert "owner" not in listing.text

        stolen = client.put(
            f"/assistant/v1/threads/{THREAD_ID}",
            headers={"X-Assistant-Owner": OTHER},
            json={"title": "Détournée"},
        )
        assert stolen.status_code == 403
        other_rows = client.get(
            "/assistant/v1/threads", headers={"X-Assistant-Owner": OTHER}
        ).json()["items"]
        assert other_rows == []

        first = client.delete(f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS)
        assert first.status_code == 204
        second = client.delete(f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS)
        assert second.status_code == 404


@pytest.mark.parametrize("thread_id", ["not-a-uuid", "01a1a447"])
def test_invalid_thread_ids_are_refused(thread_id):
    with client_for(FakeThreads()) as client:
        assert (
            client.put(
                f"/assistant/v1/threads/{thread_id}", headers=HEADERS, json={"title": "Test"}
            ).status_code
            == 400
        )
        removed = client.delete(f"/assistant/v1/threads/{thread_id}", headers=HEADERS)
        assert removed.status_code == 400


def test_a_title_is_required_and_bounded():
    with client_for(FakeThreads()) as client:
        assert client.put(
            f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS, json={}
        ).status_code == 400
        assert client.put(
            f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS, json={"title": " "}
        ).status_code == 400


def test_restore_creates_only_an_owned_thread(monkeypatch):
    calls = []
    reachable = {"value": True}

    async def fake_restore(thread_id, *, create):
        calls.append((thread_id, create))
        return reachable["value"]

    monkeypatch.setattr(routes, "restore_agent_thread", fake_restore)
    store = FakeThreads()
    with client_for(store) as client:
        owned = client.put(
            f"/assistant/v1/threads/{THREAD_ID}", headers=HEADERS, json={"title": "Inflation"}
        )
        assert owned.status_code == 200
        restored = client.post(f"/assistant/v1/threads/{THREAD_ID}/restore", headers=HEADERS)
        assert restored.status_code == 200
        assert calls[-1] == (THREAD_ID, True)

        # An unknown thread from another browser is never recreated.
        reachable["value"] = False
        unknown = str(uuid4())
        other = client.post(
            f"/assistant/v1/threads/{unknown}/restore",
            headers={"X-Assistant-Owner": OTHER},
        )
        assert other.status_code == 404
        assert calls[-1] == (unknown, False)
