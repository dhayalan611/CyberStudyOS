from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.note import Note
from ..schemas.note import NoteCreate, NoteResponse, NoteUpdate


router = APIRouter(prefix="/api/notes", tags=["Notes"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[NoteResponse])
def list_notes(db: DatabaseSession):
    return db.scalars(
        select(Note).order_by(Note.pinned.desc(), Note.updated_at.desc(), Note.id.desc())
    ).all()


@router.get("/{note_id}", response_model=NoteResponse)
def get_note(note_id: int, db: DatabaseSession):
    note = db.get(Note, note_id)
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    return note


@router.post("", response_model=NoteResponse, status_code=status.HTTP_201_CREATED)
def create_note(note: NoteCreate, db: DatabaseSession):
    db_note = Note(**note.model_dump())
    db.add(db_note)
    db.commit()
    db.refresh(db_note)
    return db_note


@router.patch("/{note_id}", response_model=NoteResponse)
def update_note(note_id: int, update: NoteUpdate, db: DatabaseSession):
    note = db.scalar(select(Note).where(Note.id == note_id).with_for_update())
    if note is None:
        raise HTTPException(status_code=404, detail="Note not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(note, field, value)
    # Force an UPDATE even for empty or unchanged payloads; use database wall time.
    note.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(note)
    return note
