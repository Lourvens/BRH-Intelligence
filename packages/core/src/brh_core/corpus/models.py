"""Public frozen contracts for corpus browsing."""

from datetime import date, datetime
from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FrozenModel(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")


class SearchMode(StrEnum):
    metadata = "metadata"
    text = "text"
    entities = "entities"
    semantic = "semantic"


class CorpusQuery(FrozenModel):
    q: str = Field(default="", max_length=300)
    mode: SearchMode = SearchMode.metadata
    family: str = Field(default="", max_length=60)
    year: int | None = Field(default=None, ge=1800, le=2200)
    entity_id: str | None = None
    document_id: str | None = None
    kind: str = Field(default="", max_length=40)
    relationship: str = Field(default="", max_length=60)
    sort: str = Field(default="title", pattern="^(title|recent|period)$")
    page: int = Field(default=1, ge=1, le=10000)
    page_size: int = Field(default=25, ge=1, le=100)

    @field_validator("entity_id", "document_id")
    @classmethod
    def valid_entity_id(cls, value):
        return str(UUID(value)) if value else None


class ResearchDocument(FrozenModel):
    document_id: str
    sha256: str
    artifact_hash: str
    publication_id: str | None = None
    published_at: datetime | None = None
    slug: str
    title: str
    family: str
    period_label: str | None = None
    period_years: tuple[int, ...] = ()
    publication_date: date | None = None
    date_basis: str = "unknown"
    uploaded_at: datetime | None = None
    source_urls: tuple[str, ...] = ()
    page_count: int
    figure_count: int = 0
    synced_at: datetime
    entity_count: int = 0
    relationship_count: int = 0
    match_page: int | None = None
    snippet: str | None = None


class DocumentPage(FrozenModel):
    document_id: str
    slug: str
    title: str
    artifact_hash: str
    publication_id: str | None = None
    published_at: datetime | None = None
    source_sha256: str = ""
    page_number: int
    page_count: int
    markdown: str
    pdf_url: str | None = None


class EntityKind(StrEnum):
    institution = "institution"
    person = "person"
    place = "place"
    regulation = "regulation"
    program = "program"
    instrument = "instrument"
    indicator = "indicator"


class Entity(FrozenModel):
    entity_id: str
    label: str
    kind: EntityKind
    aliases: tuple[str, ...] = ()
    document_count: int = 0
    mention_count: int = 0


class Evidence(FrozenModel):
    document_id: str
    slug: str
    title: str
    page_number: int
    quote: str
    artifact_hash: str
    pdf_url: str | None = None


class GraphEdge(FrozenModel):
    assertion_id: str
    subject_id: str
    object_id: str
    predicate: str
    temporal_context: str | None = None
    evidence: Evidence


class GraphResult(FrozenModel):
    nodes: tuple[Entity, ...] = ()
    edges: tuple[GraphEdge, ...] = ()
    truncated: bool = False
    hops: int = 1
