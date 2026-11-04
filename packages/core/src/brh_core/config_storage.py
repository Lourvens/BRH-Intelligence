"""Local paths and object-storage settings."""

from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field, SecretStr

from brh_core.config_base import ArtifactBackend

DEFAULT_RAW_DIR = "./data/raw"
DEFAULT_PROCESSED_DIR = "./data/processed"


class StorageSettings(BaseModel):
    data_root: Path | None = Field(default=None, validation_alias="BRH_DATA_ROOT")
    raw_dir: Path = Field(
        default_factory=lambda: Path(DEFAULT_RAW_DIR),
        validation_alias="BRH_RAW_DIR",
    )
    processed_dir: Path = Field(
        default_factory=lambda: Path(DEFAULT_PROCESSED_DIR),
        validation_alias="BRH_PROCESSED_DIR",
    )
    ocr_dir: Path = Field(
        default_factory=lambda: Path("./data/ocr"),
        validation_alias="BRH_OCR_DIR",
    )
    publication_dir: Path = Field(
        default_factory=lambda: Path("./data/published"),
        validation_alias="BRH_PUBLICATION_DIR",
    )
    artifact_backend: ArtifactBackend = Field(
        default=ArtifactBackend.local, validation_alias="BRH_ARTIFACT_BACKEND"
    )
    artifact_s3_bucket: str = Field(default="", validation_alias="BRH_ARTIFACT_S3_BUCKET")
    artifact_s3_endpoint: str = Field(default="", validation_alias="BRH_ARTIFACT_S3_ENDPOINT")
    artifact_s3_region: str = Field(default="us-east-1", validation_alias="BRH_ARTIFACT_S3_REGION")
    aws_access_key_id: SecretStr = Field(
        default=SecretStr(""), validation_alias="AWS_ACCESS_KEY_ID"
    )
    aws_secret_access_key: SecretStr = Field(
        default=SecretStr(""), validation_alias="AWS_SECRET_ACCESS_KEY"
    )
