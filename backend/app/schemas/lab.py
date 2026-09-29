from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class LabCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    platform: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=255)
    difficulty: str = Field(min_length=1, max_length=255)
    status: str = Field(default="Not Started", min_length=1, max_length=255)
    notes: str | None = None
    lab_url: str | None = Field(default=None, max_length=2048)


class LabUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    platform: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, min_length=1, max_length=255)
    difficulty: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = Field(default=None, min_length=1, max_length=255)
    notes: str | None = None
    lab_url: str | None = Field(default=None, max_length=2048)

    @field_validator("title", "platform", "category", "difficulty", "status")
    @classmethod
    def reject_null_required_fields(cls, value: str | None) -> str:
        # Omitted fields skip validation; explicitly supplied null is invalid.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class LabResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    platform: str
    category: str
    difficulty: str
    status: str
    notes: str | None
    lab_url: str | None
    completed_at: datetime | None
    created_at: datetime
