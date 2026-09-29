from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.study_session import StudySession
from ..schemas.study_session import StudySessionCreate, StudySessionResponse, StudySessionUpdate


router = APIRouter(prefix="/api/study-sessions", tags=["Study Sessions"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[StudySessionResponse])
def list_study_sessions(db: DatabaseSession):
    return db.scalars(select(StudySession).order_by(StudySession.start_time.asc(), StudySession.id.asc())).all()


@router.get("/{session_id}", response_model=StudySessionResponse)
def get_study_session(session_id: int, db: DatabaseSession):
    session = db.get(StudySession, session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Study session not found")
    return session


@router.post("", response_model=StudySessionResponse, status_code=status.HTTP_201_CREATED)
def create_study_session(payload: StudySessionCreate, db: DatabaseSession):
    session = StudySession(**payload.model_dump())
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.patch("/{session_id}", response_model=StudySessionResponse)
def update_study_session(session_id: int, update: StudySessionUpdate, db: DatabaseSession):
    # Serialize concurrent edits so validation uses the latest stored interval.
    session = db.scalar(select(StudySession).where(StudySession.id == session_id).with_for_update())
    if session is None:
        raise HTTPException(status_code=404, detail="Study session not found")
    changes = update.model_dump(exclude_unset=True)
    combined = {field: getattr(session, field) for field in StudySessionCreate.model_fields}
    try:
        StudySessionCreate.model_validate({**combined, **changes})
    except ValidationError as error:
        raise RequestValidationError([
            {**detail, "loc": ("body", *detail["loc"])}
            for detail in error.errors(include_context=False)
        ]) from error
    # Nothing is mutated until the entire resulting session has passed validation.
    for field, value in changes.items():
        setattr(session, field, value)
    session.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(session)
    return session
