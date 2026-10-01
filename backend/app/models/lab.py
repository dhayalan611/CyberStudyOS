from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .user import User


class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_labs_user_id_users", ondelete="RESTRICT"), index=True
    )
    user: Mapped["User | None"] = relationship(back_populates="labs")
    title: Mapped[str] = mapped_column(String(255))
    platform: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(255))
    difficulty: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(
        String(255), default="Not Started", server_default="Not Started"
    )
    notes: Mapped[str | None] = mapped_column(Text)
    lab_url: Mapped[str | None] = mapped_column(String(2048))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
