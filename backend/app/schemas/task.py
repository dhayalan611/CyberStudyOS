from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, StringConstraints, field_validator


TaskPriority = Literal["Low", "Medium", "High"]
TaskStatus = Literal["To Do", "In Progress", "Completed"]
RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=255)]


class TaskInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("due_date", check_fields=False)
    @classmethod
    def normalize_due_date(cls, value: datetime | None) -> datetime | None:
        # Interpret dates without an offset as UTC, independent of the database timezone.
        if value is not None and value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value


class TaskCreate(TaskInput):
    title: RequiredText
    description: str | None = None
    category: RequiredText
    priority: TaskPriority = "Medium"
    status: TaskStatus = "To Do"
    due_date: datetime | None = None


class TaskUpdate(TaskInput):
    title: RequiredText | None = None
    description: str | None = None
    category: RequiredText | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: datetime | None = None

    @field_validator("title", "category", "priority", "status")
    @classmethod
    def reject_null_required_fields(cls, value: str | None) -> str:
        # Omission is allowed; explicit null is reserved for optional database fields.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    category: str
    priority: TaskPriority
    status: TaskStatus
    due_date: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
