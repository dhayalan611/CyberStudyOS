from datetime import date, datetime
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


CertificationStatus = Literal["Planned", "In Progress", "Earned", "Expired"]


class CertificationDates(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    issue_date: date | None = None
    expiry_date: date | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> Self:
        if (
            self.issue_date is not None
            and self.expiry_date is not None
            and self.expiry_date < self.issue_date
        ):
            raise ValueError("expiry_date must not be earlier than issue_date")
        return self


class CertificationCreate(CertificationDates):
    name: str = Field(min_length=1, max_length=255)
    issuer: str = Field(min_length=1, max_length=255)
    status: CertificationStatus = "Planned"
    credential_id: str | None = Field(default=None, max_length=255)
    credential_url: str | None = Field(default=None, max_length=2048)
    notes: str | None = None


class CertificationUpdate(CertificationDates):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    issuer: str | None = Field(default=None, min_length=1, max_length=255)
    status: CertificationStatus | None = None
    credential_id: str | None = Field(default=None, max_length=255)
    credential_url: str | None = Field(default=None, max_length=2048)
    notes: str | None = None

    @field_validator("name", "issuer", "status")
    @classmethod
    def reject_null_required_fields(cls, value: str | None) -> str:
        # Omission is allowed; explicit null cannot clear a required column.
        if value is None:
            raise ValueError("This field cannot be null")
        return value


class CertificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    issuer: str
    status: CertificationStatus
    credential_id: str | None
    credential_url: str | None
    issue_date: date | None
    expiry_date: date | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
