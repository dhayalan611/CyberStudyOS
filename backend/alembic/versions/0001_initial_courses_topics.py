"""Baseline the existing courses and topics schema.

Existing matching databases must be stamped at 0001, not upgraded from base.
Fresh databases can run upgrade head to create these tables.
"""

from alembic import op
import sqlalchemy as sa


revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=255), nullable=False),
        sa.Column("progress", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("completed_topics", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("total_topics", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id", name="courses_pkey"),
    )
    op.create_table(
        "topics",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], name="topics_course_id_fkey", ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="topics_pkey"),
    )
    op.create_index("ix_topics_course_id", "topics", ["course_id"], unique=False)


def downgrade() -> None:
    raise RuntimeError(
        "The initial baseline cannot be downgraded: dropping courses and topics "
        "would delete existing data."
    )
