from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ProjectCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=255)
    description: str | None = None
    category: str = Field(min_length=1, max_length=255)
    status: str = Field(
        default="Planning", min_length=1, max_length=255,
        description="Suggested values: Planning, In Progress, Completed, On Hold.",
    )
    technologies: str | None = None
    github_url: str | None = Field(default=None, max_length=2048)
    project_url: str | None = Field(default=None, max_length=2048)
    progress: int = Field(default=0, ge=0, le=100, strict=True)
    started_at: datetime | None = None


class ProjectUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category: str | None = Field(default=None, min_length=1, max_length=255)
    status: str | None = Field(default=None, min_length=1, max_length=255)
    technologies: str | None = None
    github_url: str | None = Field(default=None, max_length=2048)
    project_url: str | None = Field(default=None, max_length=2048)
    progress: int | None = Field(default=None, ge=0, le=100, strict=True)
    started_at: datetime | None = None

    @field_validator("title", "category", "status", "progress")
    @classmethod
    def reject_null_required_fields(cls, value: str | int | None) -> str | int:
        # Omitted fields skip validation; explicit null cannot clear required fields.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category: str
    status: str
    technologies: str | None
    github_url: str | None
    project_url: str | None
    progress: int
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
