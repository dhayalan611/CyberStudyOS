from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.certification import Certification
from ..schemas.certification import (
    CertificationCreate,
    CertificationResponse,
    CertificationUpdate,
)


router = APIRouter(prefix="/api/certifications", tags=["Certifications"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CertificationResponse])
def list_certifications(db: DatabaseSession):
    return db.scalars(
        select(Certification).order_by(
            Certification.updated_at.desc(), Certification.id.desc()
        )
    ).all()


@router.get("/{certification_id}", response_model=CertificationResponse)
def get_certification(certification_id: int, db: DatabaseSession):
    certification = db.get(Certification, certification_id)
    if certification is None:
        raise HTTPException(status_code=404, detail="Certification not found")
    return certification


@router.post("", response_model=CertificationResponse, status_code=status.HTTP_201_CREATED)
def create_certification(certification: CertificationCreate, db: DatabaseSession):
    db_certification = Certification(**certification.model_dump())
    db.add(db_certification)
    db.commit()
    db.refresh(db_certification)
    return db_certification


@router.patch("/{certification_id}", response_model=CertificationResponse)
def update_certification(
    certification_id: int, update: CertificationUpdate, db: DatabaseSession
):
    # Serialize updates so validation sees the latest committed date pair.
    certification = db.scalar(
        select(Certification)
        .where(Certification.id == certification_id)
        .with_for_update()
    )
    if certification is None:
        raise HTTPException(status_code=404, detail="Certification not found")
    changes = update.model_dump(exclude_unset=True)
    stored = {
        field: getattr(certification, field)
        for field in CertificationCreate.model_fields
    }
    try:
        CertificationCreate.model_validate({**stored, **changes})
    except ValidationError as error:
        raise RequestValidationError([
            {**item, "loc": ("body", *item["loc"])}
            for item in error.errors(include_context=False)
        ]) from None
    for field, value in changes.items():
        setattr(certification, field, value)
    # Successful empty or unchanged patches also refresh updated_at.
    certification.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(certification)
    return certification
