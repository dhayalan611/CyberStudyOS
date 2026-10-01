"""Run from backend: python -m app.claim_legacy --username YOUR_USERNAME."""
import argparse

from sqlalchemy.exc import SQLAlchemyError

from .database import SessionLocal, engine
from .services.legacy_ownership import ClaimError, claim_legacy_data


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Assign unowned legacy data to an existing user in the configured database.")
    parser.add_argument("--username", required=True, help="Existing V2 username; no password is accepted")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--yes", action="store_true", help="Explicitly approve the claim without an interactive prompt")
    mode.add_argument("--dry-run", action="store_true", help="Print counts only; do not claim anything")
    args = parser.parse_args(argv)

    def confirm(username: str) -> bool:
        if args.yes:
            return True
        return input(f"Type 'claim {username}' to assign these records: ") == f"claim {username}"

    try:
        print(f"Configured database: {engine.url.database}")
        claim_legacy_data(SessionLocal, args.username, confirm=confirm, output=print, dry_run=args.dry_run)
    except ClaimError as error:
        print(str(error))
        return 1
    except (EOFError, KeyboardInterrupt):
        print("Cancelled; no records changed.")
        return 1
    except SQLAlchemyError:
        # Database exceptions can include SQL parameters or connection details.
        print("Database operation failed; claim transaction rolled back. Check configuration and migrations.")
        return 1
    finally:
        engine.dispose()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
