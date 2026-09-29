from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator


CTFStatus = Literal["Not Started", "In Progress", "Completed"]
CTFDifficulty = Literal["Easy", "Medium", "Hard"]
# PostgreSQL INTEGER storage limit; rejecting overflow avoids a database error.
NonnegativeInteger = Annotated[int, Field(ge=0, le=2_147_483_647, strict=True)]
RequiredText = Annotated[str, Field(min_length=1, max_length=255)]


class CTFChallengeCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: RequiredText
    platform: RequiredText
    category: RequiredText
    difficulty: CTFDifficulty
    status: CTFStatus = "Not Started"
    points: NonnegativeInteger = 0
    flag_captured: StrictBool = False
    hints_used: NonnegativeInteger = 0
    notes: str | None = None
    challenge_url: str | None = Field(default=None, max_length=2048)


class CTFChallengeUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    title: RequiredText | None = None
    platform: RequiredText | None = None
    category: RequiredText | None = None
    difficulty: CTFDifficulty | None = None
    status: CTFStatus | None = None
    points: NonnegativeInteger | None = None
    flag_captured: StrictBool | None = None
    hints_used: NonnegativeInteger | None = None
    notes: str | None = None
    challenge_url: str | None = Field(default=None, max_length=2048)

    @field_validator("title", "platform", "category", "difficulty", "status", "points", "flag_captured", "hints_used")
    @classmethod
    def reject_null_required_fields(cls, value):
        # Omitted values skip this validator; explicit null cannot clear required fields.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class CTFChallengeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    platform: str
    category: str
    difficulty: CTFDifficulty
    status: CTFStatus
    points: int
    flag_captured: bool
    hints_used: int
    notes: str | None
    challenge_url: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
