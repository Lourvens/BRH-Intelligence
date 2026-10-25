"""Explicit provisioning and compatibility checks for Pinecone indexes."""

from brh_core.config import Settings, VectorBackend
from brh_core.vectorstore.pinecone_client import validate_raw_index
from brh_core.vectorstore.pinecone_integrated import _dict


def provision_index(settings: Settings, *, cloud="aws", region="us-east-1") -> None:
    from pinecone import Pinecone, ServerlessSpec

    if settings.vector_backend not in (VectorBackend.pinecone, VectorBackend.pinecone_integrated):
        raise ValueError("Pinecone provisioning requires a Pinecone vector backend")
    client = Pinecone(api_key=settings.pinecone_api_key.get_secret_value())
    if client.has_index(settings.pinecone_index_name):
        description = _dict(client.describe_index(settings.pinecone_index_name))
        if settings.vector_backend == VectorBackend.pinecone:
            validate_raw_index(description, settings.embedding_dim)
        else:
            embed = description.get("embed") or {}
            if embed.get("model") != settings.embedding_model:
                raise ValueError("Pinecone index model does not match configured embedding model")
            if embed.get("field_map", {}).get("text") != settings.pinecone_text_field:
                raise ValueError(
                    "Pinecone index field_map.text does not match configured text field"
                )
            if description.get("dimension") != settings.embedding_dim:
                raise ValueError("Pinecone index dimension does not match configured dimension")
            if description.get("metric") != "cosine" or description.get("vector_type") != "dense":
                raise ValueError("Pinecone integrated index must be dense with cosine metric")
        return
    if settings.vector_backend == VectorBackend.pinecone:
        client.create_index(
            name=settings.pinecone_index_name,
            dimension=settings.embedding_dim,
            metric="cosine",
            vector_type="dense",
            spec=ServerlessSpec(cloud=cloud, region=region),
            deletion_protection="enabled",
            timeout=120,
        )
        return
    client.create_index_for_model(
        name=settings.pinecone_index_name,
        cloud=cloud,
        region=region,
        embed={
            "model": settings.embedding_model,
            "field_map": {"text": settings.pinecone_text_field},
            "write_parameters": {"input_type": "passage", "truncate": "NONE"},
            "read_parameters": {"input_type": "query", "truncate": "NONE"},
        },
        deletion_protection="enabled",
        timeout=120,
    )
