from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import Course, Topic


def recalculate_course_progress(db: Session, course: Course) -> None:
    """Preserve the planned total; the caller holds the parent course row lock."""
    db.flush()
    total, completed = db.execute(
        select(
            func.count(Topic.id),
            func.count(Topic.id).filter(Topic.completed.is_(True)),
        ).where(Topic.course_id == course.id)
    ).one()
    total = max(course.total_topics, total)
    course.total_topics = total
    course.completed_topics = completed
    # Round to the nearest integer, with .5 rounding up, without float error.
    rounded = (completed * 100 + total // 2) // total if total else 0
    course.progress = min(rounded, 99) if completed < total else rounded
