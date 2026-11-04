"""Offline fakes: a title model, a scripted chat model and a retrieval service."""

from brh_core.models import Citation, RetrievedChunk, SearchResult
from langchain_core.messages import AIMessage


class TitleModel:
    def invoke(self, messages, config=None):
        return AIMessage(content="Politique monétaire")


class Service:
    def __init__(self):
        self.calls = []

    def search(self, query, **kwargs):
        self.calls.append((query, kwargs))
        return SearchResult(
            question=query,
            chunks=(
                RetrievedChunk(
                    chunk_id="c", document_id="d", page_number=3, text="Taux de 5 %", score=0.9
                ),
            ),
            citations=(
                Citation(
                    document_id="d",
                    slug="note",
                    title="Note BRH",
                    page_number=3,
                    snippet="Taux de 5 %",
                    score=0.9,
                    pdf_url="/note.pdf",
                ),
            ),
            grounded=True,
        )


class Model:
    def __init__(self, responses):
        self.responses = iter(responses)

    def bind_tools(self, tools):
        return self

    def invoke(self, messages):
        return next(self.responses)

    def stream(self, messages):
        yield next(self.responses)
