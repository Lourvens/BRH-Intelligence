"""LangChain tool for canonical BRH passage retrieval."""

import json
from typing import Any

from brh_core.retrieval import build_retrieval_service
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class SearchInput(BaseModel):
    query: str = Field(
        min_length=1, max_length=300, description="Recherche documentaire en français."
    )
    document_id: str | None = Field(
        default=None, description="Identifiant exact d'un document connu."
    )
    page_number: int | None = Field(
        default=None, ge=1, description="Numéro exact de page du document."
    )
    limit: int = Field(
        default=6, ge=1, le=10, description="Nombre maximal de résultats principaux."
    )


def make_search_tool(service: Any = None):
    @tool("rechercher_documents_brh", args_schema=SearchInput)
    def search(
        query: str, document_id: str | None = None, page_number: int | None = None, limit: int = 6
    ) -> str:
        """Chercher des passages BRH. Filtrer seulement si les valeurs sont connues.

        Le numéro de page et l'identifiant du document sont des filtres exacts.
        Une recherche vide ne prouve pas que le corpus ne contient aucune réponse.
        """
        selected = {
            key: value
            for key, value in {
                "document_id": document_id,
                "page_number": page_number,
            }.items()
            if value is not None
        }
        active = service
        pool = None
        try:
            if active is None:
                active, pool = build_retrieval_service()
            result = active.search(query, top_k=limit, filter=selected or None)
            return json.dumps(
                {
                    "passages": [chunk.model_dump(mode="json") for chunk in result.chunks],
                    "citations": [
                        citation.model_dump(mode="json") for citation in result.citations
                    ],
                },
                ensure_ascii=False,
            )
        finally:
            if pool is not None:
                pool.close()

    return search
