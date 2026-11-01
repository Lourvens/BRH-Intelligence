"""Research HTTP validation and failure contracts need no external services."""

from brh_agent.http import create_app
from starlette.testclient import TestClient


class FakeResearch:
    def browse_corpus(self, query):
        return {"items": [], "total": 0, "page": query.page, "page_size": query.page_size}

    def corpus_document(self, slug):
        raise FileNotFoundError("/private/data/" + slug)

    def corpus_graph(self, identifier, **kwargs):
        return {"nodes": [], "edges": [], **kwargs}

    def semantic_corpus(self, query):
        return {"items": [], "total": 0, "page": 1, "page_size": 20, "bounded": True}


def test_http_bounds_missing_document_and_no_private_path_leak():
    with TestClient(create_app(FakeResearch())) as client:
        assert client.get("/corpus/v1/documents").json()["total"] == 0
        assert client.get("/corpus/v1/documents?page_size=101").status_code == 400
        assert client.get("/corpus/v1/documents?sort=injected").status_code == 400
        result = client.get("/corpus/v1/documents/missing")
        assert result.status_code == 404
        assert "/private/" not in result.text
        assert client.get("/corpus/v1/entities/invalid/graph").status_code == 400
        assert (
            client.get(
                "/corpus/v1/entities/00000000-0000-0000-0000-000000000000/graph?hops=3"
            ).status_code
            == 400
        )


def test_semantic_requests_have_a_bounded_shared_budget():
    with TestClient(create_app(FakeResearch())) as client:
        for _ in range(10):
            assert client.get("/corpus/v1/search?q=inflation&mode=semantic").status_code == 200
        response = client.get("/corpus/v1/search?q=inflation&mode=semantic")
        assert response.status_code == 429
        assert response.headers["retry-after"] == "60"


def test_atlas_routes_validate_limits_and_clean_up_shared_pool(monkeypatch):
    from brh_agent import http

    class Atlas:
        def corpus_atlas(self, params):
            return {"nodes": [], "edges": [], "view": params.view, "truncated": False}

        def corpus_entity_page(self, params):
            return {"items": [], "total": 0, "page": params.page, "page_size": params.page_size}

    class Pool:
        closed = False

        def close(self):
            self.closed = True

    pool = Pool()
    monkeypatch.setattr(http, "build_retrieval_service", lambda: (Atlas(), pool))
    with TestClient(http.create_app()) as client:
        assert client.get("/corpus/v1/graph").json()["view"] == "mentions"
        for query in ["node_limit=501", "edge_limit=1001", "hops=3", "focus=document:bad"]:
            assert client.get("/corpus/v1/graph?" + query).status_code == 400
        assert client.get("/corpus/v1/entities?page=2").json()["page"] == 2
        assert not pool.closed
    assert pool.closed
