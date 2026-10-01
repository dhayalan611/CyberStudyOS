"""Local migration service. Never invoked by registration or resource APIs."""
from collections.abc import Callable

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from ..models import Certification, Course, CTFChallenge, Lab, Note, Project, StudySession, Task, User

OWNED_MODELS = (Course, Lab, Note, Project, Certification, CTFChallenge, Task, StudySession)


class ClaimError(Exception):
    """Safe, credential-free error suitable for CLI output."""


def claim_legacy_data(
    session_factory: Callable[[], Session],
    username: str,
    *,
    confirm: Callable[[str], bool],
    output: Callable[[str], None] = print,
    dry_run: bool = False,
) -> dict[str, int] | None:
    """Preview and atomically claim only the unowned IDs shown to the operator.

    Own the transaction, including rollback on declined confirmation or failure.
    New rows inserted after preview are excluded; changed ownership aborts the
    complete claim instead of overwriting another owner's assignment.
    """
    username = username.strip().lower()
    with session_factory() as session:
        with session.begin():
            user = session.scalar(select(User).where(User.username == username))
            if user is None:
                raise ClaimError("Target user does not exist; no records changed.")
            output(f"Target user: {user.username} (ID {user.id})")
            snapshots = {
                model: list(session.scalars(select(model.id).where(model.user_id.is_(None))))
                for model in OWNED_MODELS
            }
            counts = {model.__tablename__: len(ids) for model, ids in snapshots.items()}
            for table, count in counts.items():
                output(f"{table}: {count} unowned records")
            output("Topics inherit the owner of their Course; they are not updated separately.")
            if dry_run:
                output("Dry run; no records changed.")
                return counts
            if not any(counts.values()):
                output("No unowned records to claim.")
                return counts
            if not confirm(user.username):
                output("Cancelled; no records changed.")
                return None
            for model, ids in snapshots.items():
                # Chunk IDs to stay below PostgreSQL's bind-parameter limit.
                for start in range(0, len(ids), 1000):
                    chunk = ids[start:start + 1000]
                    table = model.__table__
                    values = {"user_id": user.id}
                    # Ownership migration must not rewrite V1 content timestamps.
                    if "updated_at" in table.c:
                        values["updated_at"] = table.c.updated_at
                    result = session.execute(
                        update(table).where(table.c.id.in_(chunk), table.c.user_id.is_(None)).values(**values)
                    )
                    if result.rowcount != len(chunk):
                        raise ClaimError("Records changed since preview; claim rolled back. Review and retry.")
        output(f"Claim committed: {sum(counts.values())} records assigned to {username}.")
        return counts
