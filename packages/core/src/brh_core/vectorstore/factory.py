"""Build the supported hosted production or deterministic offline vector store."""

from brh_core.config import EmbeddingProvider, Settings, VectorBackend
from brh_core.embeddings.hashing import HashingEmbedder
from brh_core.vectorstore.base import VectorStore
from brh_core.vectorstore.memory import InMemoryVectorStore
from brh_core.vectorstore.pinecone_integrated import PineconeIntegratedVectorStore


def build_vector_store(settings: Settings) -> VectorStore:
    if settings.vector_backend is VectorBackend.memory:
        return InMemoryVectorStore(HashingEmbedder(settings.embedding_dim))
    if settings.vector_backend is VectorBackend.pinecone:
        from brh_core.embeddings.factory import build_embedder
        from brh_core.vectorstore.pinecone_client import PineconeClientVectorStore

        embedder = build_embedder(settings)
        if embedder is None:
            raise ValueError("Client vector indexing requires a client embedder")
        return PineconeClientVectorStore(
            api_key=settings.pinecone_api_key.get_secret_value(),
            index_name=settings.pinecone_index_name,
            namespace=settings.pinecone_namespace,
            embedder=embedder,
            text_field=settings.pinecone_text_field,
            batch_size=settings.index_batch_size,
            timeout=settings.index_timeout,
            max_retries=settings.index_max_retries,
        )
    if settings.vector_backend is not VectorBackend.pinecone_integrated:
        raise ValueError("The production path uses BRH_VECTOR_BACKEND=pinecone_integrated")
    if settings.embedding_provider is not EmbeddingProvider.pinecone:
        raise ValueError("Pinecone integrated inference requires BRH_EMBEDDING_PROVIDER=pinecone")
    if settings.embedding_dim != 1024:
        raise ValueError("multilingual-e5-large requires BRH_EMBEDDING_DIM=1024")
    return PineconeIntegratedVectorStore(
        api_key=settings.pinecone_api_key.get_secret_value(),
        index_name=settings.pinecone_index_name,
        namespace=settings.pinecone_namespace,
        model=settings.embedding_model,
        text_field=settings.pinecone_text_field,
        batch_size=settings.index_batch_size,
        timeout=settings.index_timeout,
        max_retries=settings.index_max_retries,
    )
