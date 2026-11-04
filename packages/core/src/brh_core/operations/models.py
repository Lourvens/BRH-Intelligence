"""Validated contracts for user feedback and administrative review."""

from enum import StrEnum
from urllib.parse import urlsplit

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FeedbackCategory(StrEnum):
    inaccuracy = "inaccuracy"
    bug = "bug"
    suggestion = "suggestion"
    other = "other"


class FeedbackStatus(StrEnum):
    new = "new"
    in_review = "in_review"
    resolved = "resolved"


class FeedbackSubmission(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)

    category: FeedbackCategory
    message: str = Field(min_length=10, max_length=4000)
    page_path: str = Field(min_length=1, max_length=500)
    thread_id: str | None = Field(default=None, max_length=100)
    answer_excerpt: str | None = Field(default=None, max_length=2000)

    @field_validator("page_path")
    @classmethod
    def local_path(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            not value.startswith("/")
            or value.startswith("//")
            or parsed.netloc
            or parsed.scheme
            or "\\" in value
            or any(ord(character) < 32 for character in value)
        ):
            raise ValueError("Expected a local page path")
        return value


class FeedbackUpdate(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid", str_strip_whitespace=True)

    status: FeedbackStatus
    admin_note: str = Field(default="", max_length=4000)
