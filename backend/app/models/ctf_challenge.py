from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, CheckConstraint, DateTime, String, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

if TYPE_CHECKING:
    from .user import User


class CTFChallenge(Base):
    __tablename__ = "ctf_challenges"
    __table_args__ = (
        CheckConstraint("status IN ('Not Started', 'In Progress', 'Completed')", name="ck_ctf_status"),
        CheckConstraint("difficulty IN ('Easy', 'Medium', 'Hard')", name="ck_ctf_difficulty"),
        CheckConstraint("points >= 0", name="ck_ctf_points"),
        CheckConstraint("hints_used >= 0", name="ck_ctf_hints_used"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", name="fk_ctf_challenges_user_id_users", ondelete="RESTRICT"), index=True
    )
    user: Mapped["User | None"] = relationship(back_populates="ctf_challenges")
    title: Mapped[str] = mapped_column(String(255))
    platform: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(255))
    difficulty: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(255), default="Not Started", server_default="Not Started")
    points: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    flag_captured: Mapped[bool] = mapped_column(default=False, server_default=text("false"))
    hints_used: Mapped[int] = mapped_column(default=0, server_default=text("0"))
    notes: Mapped[str | None] = mapped_column(Text)
    challenge_url: Mapped[str | None] = mapped_column(String(2048))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.clock_timestamp()
    )
