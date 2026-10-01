from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import CurrentUser
from ..database import get_db
from ..models.project import Project
from ..schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate


router = APIRouter(prefix="/api/projects", tags=["Projects"])
DatabaseSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: DatabaseSession, current_user: CurrentUser):
    return db.scalars(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.updated_at.desc(), Project.id.desc())
    ).all()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: DatabaseSession, current_user: CurrentUser):
    project = db.scalar(select(Project).where(Project.user_id == current_user.id).where(Project.id == project_id))
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(project: ProjectCreate, db: DatabaseSession, current_user: CurrentUser):
    db_project = Project(**project.model_dump(), user_id=current_user.id)
    if db_project.status == "Completed":
        db_project.completed_at = datetime.now(timezone.utc)
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: int, update: ProjectUpdate, db: DatabaseSession, current_user: CurrentUser):
    # Serialize changes so completion transitions use the latest stored status.
    project = db.scalar(
        select(Project).where(Project.user_id == current_user.id).where(Project.id == project_id).with_for_update()
    )
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    previous_status = project.status
    for field, value in update.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    if project.status == "Completed":
        if project.completed_at is None:
            project.completed_at = datetime.now(timezone.utc)
    elif previous_status == "Completed":
        project.completed_at = None
    # Also refresh the timestamp for empty or unchanged PATCH payloads.
    project.updated_at = func.clock_timestamp()
    db.commit()
    db.refresh(project)
    return project
