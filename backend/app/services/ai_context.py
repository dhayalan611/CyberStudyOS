"""Explicit, bounded, read-only projections for selected application sources."""

from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from ..models.course import Course
from ..models.lab import Lab
from ..models.note import Note
from ..models.project import Project
from ..models.certification import Certification
from ..models.ctf_challenge import CTFChallenge
from ..schemas.ai import ContextSource


MAX_NOTES = 5
MAX_NOTE_CHARACTERS = 1000
MAX_FIELD_CHARACTERS = 300
MAX_RECORDS_PER_SOURCE = {
    "learning": 8, "labs": 8, "notes": MAX_NOTES,
    "projects": 8, "certifications": 8, "ctf": 8,
}


def short(column):
    # Bound even unbounded text columns inside PostgreSQL, before fetching.
    return func.substr(column, 1, MAX_FIELD_CHARACTERS).label(column.key)


def active_first(column):
    return case((column == "In Progress", 0), (column == "Completed", 2), else_=1)


def context_query(source: ContextSource, *, user_id: int):
    if source == "learning":
        return select(short(Course.title), short(Course.category), Course.progress,
                      Course.completed_topics, Course.total_topics).where(Course.user_id == user_id).order_by(
                          (Course.progress >= 100), Course.created_at.desc(), Course.id.desc())
    if source == "labs":
        return select(short(Lab.title), short(Lab.platform), short(Lab.category),
                      short(Lab.difficulty), short(Lab.status),
                      (Lab.status == "Completed").label("completed")).where(Lab.user_id == user_id).order_by(
                          active_first(Lab.status), Lab.created_at.desc(), Lab.id.desc())
    if source == "notes":
        return select(short(Note.title), short(Note.category), short(Note.tags),
                      func.substr(Note.content, 1, MAX_NOTE_CHARACTERS).label("content_excerpt"),
                      (func.length(Note.content) > MAX_NOTE_CHARACTERS).label("excerpt_truncated")
                      ).where(Note.user_id == user_id).order_by(Note.updated_at.desc(), Note.id.desc())
    if source == "projects":
        return select(short(Project.title), short(Project.category), short(Project.status),
                      Project.progress, short(Project.technologies)).where(Project.user_id == user_id).order_by(
                          active_first(Project.status), Project.updated_at.desc(), Project.id.desc())
    if source == "certifications":
        return select(short(Certification.name), short(Certification.issuer),
                      short(Certification.status), Certification.issue_date,
                      Certification.expiry_date).where(Certification.user_id == user_id).order_by(
                          Certification.updated_at.desc(), Certification.id.desc())
    if source == "ctf":
        return select(short(CTFChallenge.title), short(CTFChallenge.platform),
                      short(CTFChallenge.category), short(CTFChallenge.difficulty),
                      short(CTFChallenge.status), CTFChallenge.points,
                      CTFChallenge.flag_captured, CTFChallenge.hints_used).where(CTFChallenge.user_id == user_id).order_by(
                          active_first(CTFChallenge.status), CTFChallenge.updated_at.desc(),
                          CTFChallenge.id.desc())
    raise ValueError("Unsupported context source")


def load_context(db: Session, sources: list[ContextSource], *, user_id: int) -> dict:
    context = {}
    for source in sources:
        limit = MAX_RECORDS_PER_SOURCE[source]
        try:
            rows = db.execute(context_query(source, user_id=user_id).limit(limit + 1)).mappings().all()
        except SQLAlchemyError:
            raise HTTPException(
                status_code=503,
                detail=f"Could not load {source} context. Please try again or deselect this source.",
            ) from None
        records = [
            {key: value.isoformat() if isinstance(value, (date, datetime)) else value
             for key, value in row.items()}
            for row in rows[:limit]
        ]
        context[source] = {
            "records": records,
            "has_more_records": len(rows) > limit,
            "record_limit": limit,
            "text_field_character_limit": MAX_FIELD_CHARACTERS,
        }
    return context
