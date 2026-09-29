from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.lab import Lab
from ..schemas.lab import LabCreate, LabResponse, LabUpdate


router = APIRouter(prefix="/api/labs", tags=["Labs"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[LabResponse])
def list_labs(db: DatabaseSession):
    return db.scalars(select(Lab).order_by(Lab.id)).all()


@router.get("/{lab_id}", response_model=LabResponse)
def get_lab(lab_id: int, db: DatabaseSession):
    lab = db.get(Lab, lab_id)
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    return lab


@router.post("", response_model=LabResponse, status_code=status.HTTP_201_CREATED)
def create_lab(lab: LabCreate, db: DatabaseSession):
    db_lab = Lab(**lab.model_dump())
    if db_lab.status == "Completed":
        db_lab.completed_at = datetime.now(timezone.utc)
    db.add(db_lab)
    db.commit()
    db.refresh(db_lab)
    return db_lab


@router.patch("/{lab_id}", response_model=LabResponse)
def update_lab(lab_id: int, update: LabUpdate, db: DatabaseSession):
    # Serialize edits so concurrent status changes use the latest saved status.
    lab = db.scalar(select(Lab).where(Lab.id == lab_id).with_for_update())
    if lab is None:
        raise HTTPException(status_code=404, detail="Lab not found")
    changes = update.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] != lab.status:
        lab.completed_at = (
            datetime.now(timezone.utc) if changes["status"] == "Completed" else None
        )
    for field, value in changes.items():
        setattr(lab, field, value)
    db.commit()
    db.refresh(lab)
    return lab
