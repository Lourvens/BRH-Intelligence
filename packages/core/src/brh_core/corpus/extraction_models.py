"""Versioned schemas for entity proposals and reviewed publication policies."""

from enum import StrEnum

from pydantic import Field, model_validator

from brh_core.corpus.models import EntityKind, FrozenModel

PROMPT_VERSION = "research-graph-v3"


class Predicate(StrEnum):
    references = "references"
    publishes = "publishes"
    regulates = "regulates"
    supervises = "supervises"
    measures = "measures"
    reports_on = "reports_on"
    participates_in = "participates_in"
    finances = "finances"
    part_of = "part_of"


class ProposedEntity(FrozenModel):
    ref: str = Field(min_length=1, max_length=40)
    label: str = Field(min_length=1, max_length=200)
    kind: EntityKind
    surface: str = Field(min_length=1, max_length=300)
    aliases: tuple[str, ...] = Field(max_length=20)
    quote: str = Field(min_length=1, max_length=2000)


class ProposedRelation(FrozenModel):
    subject: str = Field(min_length=1, max_length=40)
    object: str = Field(min_length=1, max_length=40)
    predicate: Predicate
    quote: str = Field(min_length=1, max_length=2000)
    temporal_context: str | None = Field(max_length=300)


class ExtractionProposal(FrozenModel):
    entities: tuple[ProposedEntity, ...] = Field(max_length=100)
    relationships: tuple[ProposedRelation, ...] = Field(max_length=100)


class ReviewedEntity(FrozenModel):
    label: str = Field(min_length=1, max_length=200)
    kind: EntityKind
    aliases: tuple[str, ...] = Field(max_length=30)


class ExtractionPolicy(FrozenModel):
    model: str = Field(min_length=1)
    validator_model: str = Field(default="typesafe/jev-1.14", min_length=1)
    accept_probability: float = Field(gt=0.5, le=1)
    reject_probability: float = Field(ge=0, lt=0.5)
    approved_by: str = Field(default="", max_length=200)
    evaluation_reference: str = Field(default="", max_length=500)
    entities: tuple[ReviewedEntity, ...] = ()

    @model_validator(mode="after")
    def thresholds_are_ordered(self):
        if self.reject_probability >= self.accept_probability:
            raise ValueError("Rejection threshold must be below acceptance threshold")
        return self

    @property
    def approved(self) -> bool:
        return bool(self.approved_by.strip() and self.evaluation_reference.strip())
