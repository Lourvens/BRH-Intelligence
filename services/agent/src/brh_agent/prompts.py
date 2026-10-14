"""Prompts.

French-first: the corpus is French and so are the answers (ADR-0004). The
system prompt must be blunt about grounding — the product's promise is that an
answer is either supported by the documents or refused.

TODO: write the prompts. Replace the placeholders below.
"""

from __future__ import annotations

from typing import Any

SYSTEM_PROMPT = (
    "TODO: French system prompt. Rules: answer ONLY from the provided extracts; "
    "cite each claim with [n]; say explicitly when the extracts do not support "
    "an answer; answer in French."
)

REFUSAL = "TODO: French refusal text shown when retrieval finds nothing above the score threshold."


def build_user_prompt(question: str, retrieved: list[dict[str, Any]]) -> str:
    """Compose the grounded user turn from the question and the extracts.

    Each extract is a dumped :class:`~brh_core.models.RetrievedChunk` with at
    least ``text``, ``page_number``, and (ideally) ``title``. Number them
    ``[1]``, ``[2]``, … so the model can cite them.
    """
    raise NotImplementedError("TODO: build the grounded prompt")
