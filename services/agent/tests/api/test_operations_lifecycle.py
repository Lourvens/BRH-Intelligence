"""Operations reuse the durable runtime pool and serialize degraded health safely."""

from datetime import UTC, date, datetime
from uuid import uuid4

import pytest
from brh_core.config import Settings
from brh_core.corpus.storage import StorageUnavailable
from brh_core.operations import OperationsRepository
from starlette.testclient import TestClient

from api import app as api_app


class FakePool:
    closed = False

    def close(self):
        self.closed = True


class ReportingStore:
    def overview(self):
        return {
            "generated_at": datetime(2026, 1, 1, tzinfo=UTC),
            "usage": {"daily": [{"date": date(2026, 1, 1), "total_tokens": 42}]},
            "jobs": {
                "recent": [{"job_id": uuid4(), "started_at": datetime(2026, 1, 1, tzinfo=UTC)}]
            },
        }


def test_runtime_operations_share_and_close_retrieval_pool(monkeypatch):
    pool = FakePool()
    retrieval = object()
    monkeypatch.setattr(api_app, "build_retrieval_service", lambda: (retrieval, pool))
    settings = Settings(_env_file=None, vector_backend="pinecone", feedback_hourly_limit=2)
    app = api_app.create_app(settings=settings)
    with TestClient(app):
        assert isinstance(app.state.operations, OperationsRepository)
        assert app.state.operations.pool is pool
        assert app.state.operations.hourly_limit == 2
        assert app.state.retrieval is retrieval
        assert pool.closed is False
    assert pool.closed is True


@pytest.mark.parametrize("failure", [StorageUnavailable, RuntimeError, FileNotFoundError])
def test_readiness_failure_is_partial_and_datetimes_remain_json_serializable(failure):
    class Retrieval:
        def corpus_stats(self):
            return {"as_of": datetime(2026, 1, 1, tzinfo=UTC)}

        def corpus_readiness(self):
            raise failure("/private/credentials")

    settings = Settings(_env_file=None, admin_api_token="test-token", rate_limit_enabled=False)
    with TestClient(api_app.create_app(Retrieval(), ReportingStore(), settings)) as client:
        response = client.get("/admin/v1/overview", headers={"Authorization": "Bearer test-token"})
        assert response.status_code == 200
        result = response.json()
        assert result["generated_at"] == "2026-01-01T00:00:00Z"
        assert result["corpus"]["as_of"] == "2026-01-01T00:00:00Z"
        assert result["usage"]["daily"][0]["date"] == "2026-01-01"
        assert isinstance(result["jobs"]["recent"][0]["job_id"], str)
        assert result["readiness"] is None
        assert "/private" not in response.text
