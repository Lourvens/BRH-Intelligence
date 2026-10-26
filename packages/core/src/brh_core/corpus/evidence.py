"""Reject proposals whose evidence is absent from the source page."""

from brh_core.corpus.entity_types import is_temporal_label
from brh_core.corpus.extraction_models import ExtractionProposal
from brh_core.corpus.metadata import normalize


def validate_proposal(proposal: ExtractionProposal, markdown: str) -> None:
    entities = {entity.ref: entity for entity in proposal.entities}
    if len(entities) != len(proposal.entities):
        raise ValueError("Duplicate entity references")
    for entity in proposal.entities:
        if is_temporal_label(entity.label) or is_temporal_label(entity.surface):
            raise ValueError("Standalone temporal values belong in temporal_context, not entities")
        if entity.quote not in markdown or entity.surface not in entity.quote:
            raise ValueError("Entity quote or surface is absent from source evidence")
        if normalize(entity.label) not in normalize(markdown):
            raise ValueError("Entity label is absent from source evidence")
        if any(not alias.strip() or len(alias) > 200 for alias in entity.aliases):
            raise ValueError("Invalid entity alias")
        if any(normalize(alias) not in normalize(markdown) for alias in entity.aliases):
            raise ValueError("Entity alias is absent from source evidence")
    for relation in proposal.relationships:
        if relation.subject not in entities or relation.object not in entities:
            raise ValueError("Unresolved relationship endpoint")
        if relation.subject == relation.object:
            raise ValueError("Self relationship is not supported")
        if relation.quote not in markdown:
            raise ValueError("Relationship quote is absent from source evidence")
        for reference in (relation.subject, relation.object):
            if entities[reference].surface not in relation.quote:
                raise ValueError("Relationship quote must contain both endpoint surfaces")


def page_parts(markdown: str, limit=12000) -> list[str]:
    """Keep every character; splitting never changes the evidence text."""
    parts = []
    while markdown:
        end = len(markdown) if len(markdown) <= limit else markdown.rfind("\n", 0, limit)
        if end <= 0:
            end = limit
        parts.append(markdown[:end])
        markdown = markdown[end:]
        if markdown.startswith("\n") and end < limit:
            # Include the delimiter in the next part, rather than dropping it.
            if markdown == "\n":
                parts[-1] += markdown
                break
            if not markdown[:limit].strip():
                parts.append(markdown[:limit])
                markdown = markdown[limit:]
    return parts or [""]
