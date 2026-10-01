from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .user import User


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_projects_user_id_users", ondelete="RESTRICT"), index=True
    )
    user: Mapped["User | None"] = relationship(back_populates="projects")
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(
        String(255), default="Planning", server_default="Planning"
    )
    technologies: Mapped[str | None] = mapped_column(String)
    github_url: Mapped[str | None] = mapped_column(String(2048))
    project_url: Mapped[str | None] = mapped_column(String(2048))
    progress: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.clock_timestamp()
    )
