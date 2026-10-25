"""Embedding failures that require intervention rather than another document."""


class EmbeddingBlockedError(RuntimeError):
    """Authentication, credit, quota or model-contract failure stops the worker."""
