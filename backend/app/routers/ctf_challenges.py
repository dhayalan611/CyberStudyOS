from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.ctf_challenge import CTFChallenge
from ..schemas.ctf_challenge import CTFChallengeCreate, CTFChallengeResponse, CTFChallengeUpdate


router = APIRouter(prefix="/api/ctf", tags=["CTF Challenges"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CTFChallengeResponse])
def list_challenges(db: DatabaseSession):
    return db.scalars(
        select(CTFChallenge).order_by(CTFChallenge.updated_at.desc(), CTFChallenge.id.desc())
    ).all()


@router.get("/{challenge_id}", response_model=CTFChallengeResponse)
def get_challenge(challenge_id: int, db: DatabaseSession):
    challenge = db.get(CTFChallenge, challenge_id)
    if challenge is None:
        raise HTTPException(status_code=404, detail="CTF challenge not found")
    return challenge


@router.post("", response_model=CTFChallengeResponse, status_code=status.HTTP_201_CREATED)
def create_challenge(payload: CTFChallengeCreate, db: DatabaseSession):
    challenge = CTFChallenge(**payload.model_dump())
    # Creating directly in an active state is also supported.
    if challenge.status == "In Progress":
        challenge.started_at = datetime.now(timezone.utc)
    elif challenge.status == "Completed":
        challenge.completed_at = datetime.now(timezone.utc)
    db.add(challenge)
    db.commit()
    db.refresh(challenge)
    return challenge


@router.patch("/{challenge_id}", response_model=CTFChallengeResponse)
def update_challenge(challenge_id: int, update: CTFChallengeUpdate, db: DatabaseSession):
    # Serialize transitions so concurrent updates preserve the first start time.
    challenge = db.scalar(
        select(CTFChallenge).where(CTFChallenge.id == challenge_id).with_for_update()
    )
    if challenge is None:
        raise HTTPException(status_code=404, detail="CTF challenge not found")
    previous_status = challenge.status
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(challenge, field, value)
    if previous_status == "Not Started" and challenge.status == "In Progress" and challenge.started_at is None:
        challenge.started_at = datetime.now(timezone.utc)
    if challenge.status == "Completed":
        if challenge.completed_at is None:
            challenge.completed_at = datetime.now(timezone.utc)
    else:
        challenge.completed_at = None
    # Empty and unchanged PATCH requests must also advance updated_at.
    challenge.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(challenge)
    return challenge
