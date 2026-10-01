from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..database import get_db
from ..models.task import Task
from ..schemas.task import TaskCreate, TaskResponse, TaskUpdate


router = APIRouter(prefix="/api/tasks", tags=["Tasks"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[TaskResponse])
def list_tasks(db: DatabaseSession, current_user: CurrentUser):
    return db.scalars(
        select(Task).where(Task.user_id == current_user.id).order_by(
            (Task.status == "Completed").asc(),
            Task.due_date.asc().nulls_last(),
            Task.updated_at.desc(),
            Task.created_at.desc(),
            Task.id.desc(),
        )
    ).all()


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: DatabaseSession, current_user: CurrentUser):
    task = db.scalar(select(Task).where(Task.user_id == current_user.id).where(Task.id == task_id))
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(task: TaskCreate, db: DatabaseSession, current_user: CurrentUser):
    db_task = Task(**task.model_dump(), user_id=current_user.id)
    if db_task.status == "Completed":
        db_task.completed_at = func.clock_timestamp()
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, update: TaskUpdate, db: DatabaseSession, current_user: CurrentUser):
    task = db.scalar(select(Task).where(Task.user_id == current_user.id).where(Task.id == task_id).with_for_update())
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    if task.status == "Completed":
        if task.completed_at is None:
            task.completed_at = func.clock_timestamp()
    else:
        task.completed_at = None
    # Every successful PATCH, including an empty or unchanged payload, advances this.
    task.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(task)
    return task
