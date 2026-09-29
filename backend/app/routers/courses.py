from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.course import Course
from ..schemas.course import CourseCreate, CourseResponse


router = APIRouter(prefix="/api/courses", tags=["Courses"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course: CourseCreate, db: DatabaseSession):
    db_course = Course(**course.model_dump())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.get("", response_model=list[CourseResponse])
def list_courses(db: DatabaseSession):
    return db.scalars(select(Course).order_by(Course.id)).all()


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: DatabaseSession):
    course = db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
