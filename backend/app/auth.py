"""Cookie authentication and trusted-origin protection for private resources."""
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request
from fastapi.security import APIKeyCookie
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models.user import User

COOKIE_NAME = "cyberstudy_session"
password_hasher = PasswordHash.recommended()
# Equal-cost password verification when a username does not exist.
DUMMY_HASH = password_hasher.hash("unused-dummy-password")
cookie_scheme = APIKeyCookie(name=COOKIE_NAME, auto_error=False)


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(minutes=settings.AUTH_TOKEN_MINUTES)},
        settings.AUTH_SECRET.get_secret_value(), algorithm="HS256",
    )


def get_current_user(
    token: Annotated[str | None, Depends(cookie_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(status_code=401, detail="Authentication required")
    if not token:
        raise unauthorized
    try:
        payload = jwt.decode(
            token, settings.AUTH_SECRET.get_secret_value(), algorithms=["HS256"],
            options={"require": ["sub", "exp", "iat"]},
        )
        subject = payload["sub"]
        if not isinstance(subject, str) or not subject.isascii() or not subject.isdecimal():
            raise unauthorized
        user_id = int(subject)
        if not 0 < user_id <= 2147483647:
            raise unauthorized
    except (jwt.InvalidTokenError, ValueError):
        raise unauthorized from None
    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user


def require_trusted_origin(request: Request) -> None:
    """Require an explicitly trusted browser origin on state-changing requests."""
    if request.headers.get("origin") not in settings.CORS_ORIGINS:
        raise HTTPException(status_code=403, detail="Untrusted request origin")


def get_private_user(request: Request, user: Annotated[User, Depends(get_current_user)]) -> User:
    """Authenticate first, then enforce CSRF protection for private mutations."""
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        require_trusted_origin(request)
    return user


CurrentUser = Annotated[User, Depends(get_private_user)]
