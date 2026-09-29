from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class NoteCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    content: str
    category: str = Field(min_length=1, max_length=255)
    tags: str | None = None
    pinned: bool = False


class NoteUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    content: str | None = None
    category: str | None = Field(default=None, min_length=1, max_length=255)
    tags: str | None = None
    pinned: bool | None = None

    @field_validator("title", "content", "category", "pinned")
    @classmethod
    def reject_null_required_fields(cls, value: str | bool | None) -> str | bool:
        # Omitted fields skip validation; explicit null is only allowed for tags.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    category: str
    tags: str | None
    pinned: bool
    created_at: datetime
    updated_at: datetime
