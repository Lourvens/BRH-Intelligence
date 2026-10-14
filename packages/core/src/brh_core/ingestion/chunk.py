"""Chunking — split page text into retrievable passages (ADR-0005).

Chunks never span pages, so every chunk has an unambiguous ``page_number`` and
a citation can open the exact page. Chunk ids must be deterministic
(``{document_id}:p{page}:c{ordinal}``) so re-ingestion is idempotent.

TODO: implement with ``langchain_text_splitters.RecursiveCharacterTextSplitter``.
French separators are longer-winded than English; keep ``"."``/``";"``
splitting and stay under the embedder's token ceiling.
"""

from __future__ import annotations

from collections.abc import Sequence

from brh_core.ingestion.extract import ExtractedPage
from brh_core.models import Chunk


def chunk_pages(
    document_id: str,
    pages: Sequence[ExtractedPage],
    *,
    chunk_size: int,
    chunk_overlap: int,
) -> list[Chunk]:
    """Split each page's text into chunks, preserving page provenance.

    Skip blank pages. Split **within** a page — never across pages.
    """
    raise NotImplementedError("TODO: per-page chunking")
