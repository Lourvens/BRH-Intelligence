"""Global graph input bounds are validated before database work."""

import pytest
from brh_core.corpus.models import GlobalGraphQuery
from pydantic import ValidationError


@pytest.mark.parametrize(
    "values",
    [
        {"node_limit": 501},
        {"edge_limit": 1001},
        {"hops": 3},
        {"view": "sql"},
        {"focus": "entity:invalid"},
        {"focus": "secret:00000000-0000-0000-0000-000000000000"},
        {"year": 1},
        {"unexpected": "value"},
    ],
)
def test_global_graph_rejects_unbounded_or_invalid_input(values):
    with pytest.raises((ValidationError, ValueError)):
        GlobalGraphQuery.model_validate(values)
