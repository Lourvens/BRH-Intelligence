"""Calendar dates qualify evidence; they are not places or economic indicators."""

import pytest
from brh_core.corpus.evidence import validate_proposal
from brh_core.corpus.extraction_models import ExtractionProposal


@pytest.mark.parametrize(
    "label",
    ["9 mars", "30/09/2010", "30 septembre 2010", "2010-09-30", "mars 2010", "1er octobre", "2024"],
)
@pytest.mark.parametrize("kind", ["place", "indicator"])
def test_temporal_labels_cannot_be_saved_as_entities(label, kind):
    proposal = ExtractionProposal(
        entities=[dict(ref="a", label=label, kind=kind, surface=label, aliases=[], quote=label)],
        relationships=[],
    )
    with pytest.raises(ValueError, match="temporal"):
        validate_proposal(proposal, label)


def test_date_in_a_regulation_title_does_not_erase_the_regulation():
    label = "Circulaire du 9 mars 2010"
    proposal = ExtractionProposal(
        entities=[
            dict(ref="a", label=label, kind="regulation", surface=label, aliases=[], quote=label)
        ],
        relationships=[],
    )
    validate_proposal(proposal, label)
