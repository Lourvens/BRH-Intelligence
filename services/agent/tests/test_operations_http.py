"""Offline contracts for authenticated administration and durable feedback intake."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from brh_agent.api.app import create_app
from brh_core.config import Settings
from brh_core.operations.feedback import FeedbackLimitError
from brh_core.operations.models import FeedbackStatus
from starlette.testclient import TestClient

TOKEN = "test-operations-token"
AUTH = {"Authorization": f"Bearer {TOKEN}"}
IDENTITY = "a" * 64
SUBMISSION = {
    "category": "bug",
    "message": "La recherche ne répond plus.",
    "page_path": "/assistant",
    "thread_id": None,
    "answer_excerpt": None,
}


class FakeOperations:
    def __init__(self):
        self.items = []
        self.identities = []
        self.deny = False

    def submit(self, submission, identity):
        if self.deny:
            raise FeedbackLimitError(120)
        item = {
            "id": str(uuid4()),
            **submission.model_dump(),
            "status": "new",
            "admin_note": "",
            "created_at": datetime.now(UTC),
            "updated_at": datetime.now(UTC),
        }
        self.items.append(item)
        self.identities.append(identity)
        return item

    def list_feedback(self, status, page):
        rows = [item for item in self.items if status is None or item["status"] == status]
        return {
            "items": rows[(page - 1) * 20 : page * 20],
            "total": len(rows),
            "page": page,
            "page_size": 20,
        }

    def update(self, identifier, update):
        for item in self.items:
            if item["id"] == identifier:
                item.update(update.model_dump())
                return item
        return None

    def overview(self):
        return {
            "generated_at": datetime.now(UTC),
            "usage": {"days": 30},
            "jobs": {"counts": {}, "recent": []},
            "feedback": {"total": len(self.items)},
        }


class FakeRetrieval:
    def corpus_stats(self):
        return {"readable_documents": 12}

    def corpus_readiness(self):
        return {"ready": True, "database": True, "artifact_storage": True}


def client_for(store=None, retrieval=None, token=TOKEN):
    settings = Settings(_env_file=None, admin_api_token=token, rate_limit_enabled=False)
    return TestClient(create_app(retrieval or FakeRetrieval(), store or FakeOperations(), settings))


@pytest.mark.parametrize("token", ["", "wrong", None])
def test_every_operations_endpoint_rejects_missing_or_wrong_bearer(token):
    headers = {"Authorization": f"Bearer {token}"} if token is not None else {}
    with client_for() as client:
        for method, path in [
            ("get", "/admin/v1/overview"),
            ("get", "/admin/v1/feedback"),
            ("patch", f"/admin/v1/feedback/{uuid4()}"),
            ("post", "/feedback/v1"),
        ]:
            assert getattr(client, method)(path, headers=headers).status_code == 401


def test_empty_configuration_fails_closed_even_with_empty_bearer():
    with client_for(token="") as client:
        assert (
            client.get("/admin/v1/overview", headers={"Authorization": "Bearer "}).status_code
            == 401
        )


def test_feedback_submission_review_filter_and_pagination():
    store = FakeOperations()
    with client_for(store) as client:
        headers = {**AUTH, "X-BRH-Feedback-Identity": IDENTITY}
        for _ in range(21):
            response = client.post("/feedback/v1", headers=headers, json=SUBMISSION)
            assert response.status_code == 201
            assert set(response.json()) == {"id", "status"}
        identifier = response.json()["id"]
        assert store.identities == [IDENTITY] * 21
        result = client.get("/admin/v1/feedback?page=2", headers=AUTH)
        assert result.json()["total"] == 21
        assert len(result.json()["items"]) == 1
        assert result.json()["page_size"] == 20
        assert IDENTITY not in result.text
        assert result.headers["cache-control"] == "no-store"
        for status in [FeedbackStatus.in_review, FeedbackStatus.resolved]:
            updated = client.patch(
                f"/admin/v1/feedback/{identifier}",
                headers=AUTH,
                json={"status": status, "admin_note": "Vérifié."},
            )
            assert updated.status_code == 200
            assert updated.json()["status"] == status
        assert client.get("/admin/v1/feedback?status=resolved", headers=AUTH).json()["total"] == 1
        assert client.get("/admin/v1/feedback?status=new", headers=AUTH).json()["total"] == 20


@pytest.mark.parametrize(
    "change",
    [
        {"category": "invalid"},
        {"message": "court"},
        {"message": " " * 15},
        {"message": "x" * 4001},
        {"page_path": "https://example.com"},
        {"page_path": "//example.com"},
        {"page_path": "/\\example.com"},
        {"page_path": "/" + "x" * 500},
        {"thread_id": "x" * 101},
        {"answer_excerpt": "x" * 2001},
        {"unknown": True},
    ],
)
def test_invalid_feedback_never_reaches_storage(change):
    store = FakeOperations()
    with client_for(store) as client:
        response = client.post(
            "/feedback/v1",
            headers={**AUTH, "X-BRH-Feedback-Identity": IDENTITY},
            json={**SUBMISSION, **change},
        )
        assert response.status_code == 400
        assert store.items == []


def test_feedback_identity_body_size_and_rate_limit():
    store = FakeOperations()
    with client_for(store) as client:
        assert client.post("/feedback/v1", headers=AUTH, json=SUBMISSION).status_code == 400
        headers = {**AUTH, "X-BRH-Feedback-Identity": IDENTITY}
        assert client.post("/feedback/v1", headers=headers, content="broken").status_code == 400
        assert client.post("/feedback/v1", headers=headers, content="x" * 32001).status_code == 400
        store.deny = True
        limited = client.post("/feedback/v1", headers=headers, json=SUBMISSION)
        assert limited.status_code == 429
        assert limited.headers["retry-after"] == "120"
        assert limited.json()["error"]["code"] == "rate_limited"


@pytest.mark.parametrize("query", ["status=invalid", "page=0", "page=x", "page=1000001"])
def test_invalid_admin_query_is_rejected(query):
    with client_for() as client:
        assert client.get("/admin/v1/feedback?" + query, headers=AUTH).status_code == 400


def test_review_validation_and_missing_feedback():
    with client_for() as client:
        path = f"/admin/v1/feedback/{uuid4()}"
        for update in [{"status": "deleted"}, {"status": "new", "admin_note": "x" * 4001}]:
            assert client.patch(path, headers=AUTH, json=update).status_code == 400
        assert client.patch(path, headers=AUTH, json={"status": "new"}).status_code == 404
        assert (
            client.patch("/admin/v1/feedback/bad", headers=AUTH, json={"status": "new"}).status_code
            == 400
        )


def test_overview_uses_shared_retrieval_and_returns_partial_when_corpus_fails():
    with client_for() as client:
        response = client.get("/admin/v1/overview", headers=AUTH)
        assert response.status_code == 200
        assert response.json()["corpus"]["readable_documents"] == 12
        assert response.json()["readiness"]["ready"] is True
        assert response.json()["configuration"]["rate_limit_enabled"] is False

    class Unavailable(FakeRetrieval):
        def corpus_stats(self):
            raise RuntimeError("/private/database/path")

    with client_for(retrieval=Unavailable()) as client:
        response = client.get("/admin/v1/overview", headers=AUTH)
        assert response.status_code == 200
        assert response.json()["corpus"] is None
        assert response.json()["readiness"]["ready"] is True
        assert "/private" not in response.text
