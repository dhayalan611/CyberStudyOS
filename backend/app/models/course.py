from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .user import User
    from .topic import Topic


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_courses_user_id_users", ondelete="RESTRICT"), index=True
    )
    user: Mapped["User | None"] = relationship(back_populates="courses")
    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(255))
    progress: Mapped[int] = mapped_column(default=0, server_default="0")
    completed_topics: Mapped[int] = mapped_column(default=0, server_default="0")
    total_topics: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    topics: Mapped[list["Topic"]] = relationship(
        back_populates="course", cascade="all, delete-orphan", passive_deletes=True
    )
