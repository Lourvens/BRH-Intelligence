"""Domain model.

Frozen pydantic models shared by every surface. Immutability is deliberate:
these objects cross module and service boundaries and should never be mutated
in place. Prefer constructing a new instance.

Naming follows the storage schema in ``brh_core.db`` so a row and a model are
recognisably the same thing.
"""

from __future__ import annotations

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class SourceKind(StrEnum):
    pdf_local = "pdf_local"
    pdf_web = "pdf_web"
    web_html = "web_html"


class Language(StrEnum):
    fr = "fr"
    ht = "ht"
    en = "en"
    other = "other"


class JobStage(StrEnum):
    download = "download"
    extract = "extract"
    chunk = "chunk"
    embed = "embed"
    index = "index"


class JobStatus(StrEnum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class _Frozen(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class Document(_Frozen):
    """One source artefact (a PDF today, a web page later)."""

    document_id: str
    sha256: str
    slug: str
    title: str
    source_kind: SourceKind = SourceKind.pdf_local
    language: Language = Language.fr
    publisher: str = "BRH"
    source_path: str | None = None
    source_url: str | None = None
    volume: str | None = None
    issue: str | None = None
    publication_date: date | None = None
    page_count: int = 0
    first_seen_at: datetime | None = None
    last_seen_at: datetime | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class Page(_Frozen):
    """The extracted text of a single PDF page (1-based)."""

    document_id: str
    page_number: int
    text: str


class ChunkType(StrEnum):
    """Why a passage exists — drives retrieval expansion and the inspection report."""

    prose = "prose"
    table = "table"
    series = "series"
    provision = "provision"


class Chunk(_Frozen):
    """A retrievable passage, bound to one page.

    ``page_number`` is where the passage starts; ``page_end`` differs only for a
    table or section that ran across a page boundary, and citations still open
    ``page_number`` (ADR-0005).
    """

    chunk_id: str
    document_id: str
    page_number: int
    ordinal: int
    text: str
    page_end: int | None = None
    chunk_type: ChunkType = ChunkType.prose
    section_path: tuple[str, ...] = ()
    token_count: int | None = None
    metadata: dict[str, object] = Field(default_factory=dict)

    @property
    def char_count(self) -> int:
        return len(self.text)

    @property
    def spans_pages(self) -> bool:
        return self.page_end is not None and self.page_end != self.page_number


class VectorRecord(_Frozen):
    """What the vector store persists for a chunk.

    ``text`` is always present: the vector-store layer owns whether that text
    is embedded on the client or the server (ADR-0004).
    """

    id: str
    text: str
    metadata: dict[str, object] = Field(default_factory=dict)


class RetrievedChunk(_Frozen):
    """A search hit: the passage plus its relevance score."""

    chunk_id: str
    document_id: str
    page_number: int
    text: str
    score: float
    metadata: dict[str, object] = Field(default_factory=dict)


class Citation(_Frozen):
    """A user-facing, clickable reference to a source passage."""

    document_id: str
    slug: str
    title: str
    page_number: int
    snippet: str
    score: float
    pdf_url: str
    source_url: str | None = None


class SearchResult(_Frozen):
    """The retrieval service's output — what agent and MCP both consume."""

    question: str
    chunks: tuple[RetrievedChunk, ...] = ()
    citations: tuple[Citation, ...] = ()
    grounded: bool = False

    @property
    def has_evidence(self) -> bool:
        return bool(self.chunks)
