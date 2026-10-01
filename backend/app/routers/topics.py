from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..database import get_db
from ..models import Course, Topic
from ..schemas.topic import TopicCreate, TopicResponse, TopicUpdate
from ..services.course_progress import recalculate_course_progress


router = APIRouter(prefix="/api", tags=["Topics"])
DatabaseSession = Annotated[Session, Depends(get_db)]


def get_course_for_update(db: Session, course_id: int, user_id: int) -> Course:
    # Serialize topic mutations for this course so concurrent counts stay correct.
    course = db.scalar(select(Course).where(Course.id == course_id, Course.user_id == user_id).with_for_update())
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.get("/courses/{course_id}/topics", response_model=list[TopicResponse])
def list_topics(course_id: int, db: DatabaseSession, current_user: CurrentUser):
    if db.scalar(select(Course).where(Course.id == course_id, Course.user_id == current_user.id)) is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return db.scalars(
        select(Topic).join(Course).where(
            Topic.course_id == course_id, Course.user_id == current_user.id
        ).order_by(Topic.id)
    ).all()


@router.post(
    "/courses/{course_id}/topics",
    response_model=TopicResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_topic(course_id: int, topic: TopicCreate, db: DatabaseSession, current_user: CurrentUser):
    course = get_course_for_update(db, course_id, current_user.id)
    db_topic = Topic(course_id=course.id, title=topic.title, completed=False)
    db.add(db_topic)
    recalculate_course_progress(db, course, user_id=current_user.id)
    db.commit()
    db.refresh(db_topic)
    return db_topic


@router.patch("/topics/{topic_id}", response_model=TopicResponse)
def update_topic(topic_id: int, update: TopicUpdate, db: DatabaseSession, current_user: CurrentUser):
    topic = db.scalar(select(Topic).join(Course).where(Topic.id == topic_id, Course.user_id == current_user.id))
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    course = get_course_for_update(db, topic.course_id, current_user.id)
    # Reload after acquiring the lock in case another request changed this topic.
    db.refresh(topic)
    topic.completed = update.completed
    recalculate_course_progress(db, course, user_id=current_user.id)
    db.commit()
    db.refresh(topic)
    return topic
