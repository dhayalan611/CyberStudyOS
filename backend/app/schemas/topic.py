from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TopicCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: str = Field(min_length=1, max_length=255)


class TopicResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    completed: bool
    created_at: datetime


class TopicUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    completed: bool = Field(strict=True)
