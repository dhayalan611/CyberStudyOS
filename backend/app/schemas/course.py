from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CourseCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=255)
    category: str = Field(min_length=1, max_length=255)
    total_topics: int = Field(ge=0, le=2147483647)


class CourseResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    category: str
    progress: int
    completed_topics: int
    total_topics: int
    created_at: datetime
