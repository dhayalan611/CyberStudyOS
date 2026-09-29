from datetime import datetime, timezone
from typing import Annotated, Literal, Self

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator, model_validator


StudySessionStatus = Literal["Planned", "Completed", "Skipped"]
RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class StudySessionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("start_time", "end_time", check_fields=False)
    @classmethod
    def normalize_datetime(cls, value: datetime | None) -> datetime | None:
        # Match Tasks: offset-free input is UTC, with its clock time unchanged.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value

    @model_validator(mode="after")
    def validate_interval(self) -> Self:
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be later than start_time")
        return self


class StudySessionCreate(StudySessionInput):
    title: RequiredText
    category: RequiredText
    description: str | None = None
    start_time: datetime
    end_time: datetime
    status: StudySessionStatus = "Planned"


class StudySessionUpdate(StudySessionInput):
    title: RequiredText | None = None
    category: RequiredText | None = None
    description: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    status: StudySessionStatus | None = None

    @field_validator("title", "category", "start_time", "end_time", "status")
    @classmethod
    def reject_null_required_fields(cls, value):
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class StudySessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    description: str | None
    start_time: datetime
    end_time: datetime
    status: StudySessionStatus
    created_at: datetime
    updated_at: datetime
