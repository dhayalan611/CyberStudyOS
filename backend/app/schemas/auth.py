from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, StringConstraints, field_validator


Username = Annotated[str, StringConstraints(strip_whitespace=True, to_lower=True, min_length=3, max_length=32, pattern=r"^[a-zA-Z0-9_]+$")]


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)

    username: Username
    password: SecretStr = Field(min_length=1, max_length=128)


class RegisterRequest(LoginRequest):
    email: EmailStr = Field(max_length=254)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: str
    created_at: datetime
    updated_at: datetime


class CurrentUserResponse(UserResponse):
    pass
