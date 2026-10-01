from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ..models import Course, Topic


def recalculate_course_progress(db: Session, course: Course, *, user_id: int) -> None:
    """Preserve the planned total; the caller holds the parent course row lock."""
    if course.user_id != user_id:
        raise HTTPException(status_code=404, detail="Course not found")
    db.flush()
    total, completed = db.execute(
        select(
            func.count(Topic.id),
            func.count(Topic.id).filter(Topic.completed.is_(True)),
        ).join(Course, Topic.course_id == Course.id).where(
            Topic.course_id == course.id, Course.user_id == user_id
        )
    ).one()
    total = max(course.total_topics, total)
    course.total_topics = total
    course.completed_topics = completed
    # Round to the nearest integer, with .5 rounding up, without float error.
    rounded = (completed * 100 + total // 2) // total if total else 0
    course.progress = min(rounded, 99) if completed < total else rounded
