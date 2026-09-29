from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base


class Lab(Base):
    __tablename__ = "labs"

    id: Mapped[int] = mapped_column(primary_key=True)
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
