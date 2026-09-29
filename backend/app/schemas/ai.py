from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


HISTORY_CONTEXT_LIMIT = 20
MAX_HISTORY_ENTRIES = 100
MAX_HISTORY_CONTENT_LENGTH = 32000
ContextSource = Literal["learning", "labs", "notes", "projects", "certifications", "ctf"]


class HistoryMessage(BaseModel):
    model_config = ConfigDict(extra="forbid")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_HISTORY_CONTENT_LENGTH)

    @field_validator("content")
    @classmethod
    def trim_content(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("History content must not be empty or whitespace-only")
        return value


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(min_length=1, max_length=8000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=MAX_HISTORY_ENTRIES)
    context_sources: list[ContextSource] = Field(default_factory=list, max_length=6)

    @field_validator("context_sources")
    @classmethod
    def unique_sources(cls, value: list[ContextSource]) -> list[ContextSource]:
        if len(value) != len(set(value)):
            raise ValueError("Context sources must not contain duplicates")
        return value

    @field_validator("message")
    @classmethod
    def trim_message(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Message must not be empty or whitespace-only")
        return value


class ChatResponse(BaseModel):
    reply: str
