"""Add nullable ownership while preserving unowned V1 data.

Revision ID: 0010_user_ownership
Revises: 0009_create_users
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_user_ownership"
down_revision = "0009_create_users"
branch_labels = None
depends_on = None

TABLES = (
    "courses", "labs", "notes", "projects", "certifications",
    "ctf_challenges", "tasks", "study_sessions",
)


def upgrade() -> None:
    for table in TABLES:
        op.add_column(table, sa.Column("user_id", sa.Integer(), nullable=True))
        op.create_foreign_key(f"fk_{table}_user_id_users", table, "users",
                              ["user_id"], ["id"], ondelete="RESTRICT")
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])


def downgrade() -> None:
    for table in reversed(TABLES):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_constraint(f"fk_{table}_user_id_users", table, type_="foreignkey")
        op.drop_column(table, "user_id")
