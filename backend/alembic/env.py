from alembic import context
from sqlalchemy import create_engine, pool

from app.config import settings
from app.database import Base
from app.models import User  # noqa: F401
from app.models import Certification, Course, CTFChallenge, Lab, Note, Project, StudySession, Task, Topic  # noqa: F401 - register model metadata


target_metadata = Base.metadata


def run_migrations_offline() -> None:
    context.configure(
        url=settings.DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    # Pass the URL directly: percent-encoded passwords must not be interpreted
    # as ConfigParser interpolation in alembic.ini.
    connectable = create_engine(
        settings.DATABASE_URL,
        poolclass=pool.NullPool,
        connect_args={"connect_timeout": 5},
    )
    try:
        with connectable.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
                compare_server_default=True,
            )
            with context.begin_transaction():
                context.run_migrations()
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
