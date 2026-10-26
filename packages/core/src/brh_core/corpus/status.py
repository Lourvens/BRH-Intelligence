"""Resolve active manifest targets without constructing a remote vector client."""

import re
from urllib.parse import urlsplit


def configured_index_target(settings, targets: list[str]) -> str | None:
    backend = settings.vector_backend.value
    prefix = {"pinecone": "pinecone-vectors:", "pinecone_integrated": "pinecone-records:"}.get(
        backend
    )
    if prefix is None:
        return None
    matching = []
    for target in targets:
        if not target.startswith(prefix):
            continue
        fields = target[len(prefix) :].rsplit(":", 3)
        if len(fields) != 4:
            continue
        host, namespace, contract, text_field = fields
        hostname = urlsplit(host).hostname or ""
        if not re.match(re.escape(settings.pinecone_index_name) + r"-[a-z0-9]+\.svc\.", hostname):
            continue
        expected = (
            str(settings.embedding_dim) if backend == "pinecone" else settings.embedding_model
        )
        if (namespace, contract, text_field) == (
            settings.pinecone_namespace,
            expected,
            settings.pinecone_text_field,
        ):
            matching.append(target)
    return matching[0] if len(matching) == 1 else None
