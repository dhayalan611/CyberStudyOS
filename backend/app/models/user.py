from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .course import Course
    from .lab import Lab
    from .note import Note
    from .project import Project
    from .certification import Certification
    from .ctf_challenge import CTFChallenge
    from .task import Task
    from .study_session import StudySession


class User(Base):
    __tablename__ = "users"

    courses: Mapped[list["Course"]] = relationship(back_populates="user", passive_deletes="all")
    labs: Mapped[list["Lab"]] = relationship(back_populates="user", passive_deletes="all")
    notes: Mapped[list["Note"]] = relationship(back_populates="user", passive_deletes="all")
    projects: Mapped[list["Project"]] = relationship(back_populates="user", passive_deletes="all")
    certifications: Mapped[list["Certification"]] = relationship(back_populates="user", passive_deletes="all")
    ctf_challenges: Mapped[list["CTFChallenge"]] = relationship(back_populates="user", passive_deletes="all")
    tasks: Mapped[list["Task"]] = relationship(back_populates="user", passive_deletes="all")
    study_sessions: Mapped[list["StudySession"]] = relationship(back_populates="user", passive_deletes="all")

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.clock_timestamp()
    )
