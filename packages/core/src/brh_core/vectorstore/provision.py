"""Explicit provisioning of the selected Pinecone integrated embedding index."""

from brh_core.config import Settings


def provision_index(settings: Settings, *, cloud="aws", region="us-east-1") -> None:
    from pinecone import Pinecone

    client = Pinecone(api_key=settings.pinecone_api_key.get_secret_value())
    if client.has_index(settings.pinecone_index_name):
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
