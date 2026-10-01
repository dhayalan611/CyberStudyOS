from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..auth import COOKIE_NAME, DUMMY_HASH, create_access_token, get_current_user, password_hasher, require_trusted_origin
from ..config import settings
from ..database import get_db
from ..models.user import User
from ..rate_limit import check_auth_rate_limit
from ..schemas.auth import CurrentUserResponse, LoginRequest, RegisterRequest, UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
DatabaseSession = Annotated[Session, Depends(get_db)]
mutations = [Depends(require_trusted_origin), Depends(check_auth_rate_limit)]


@router.post("/register", response_model=UserResponse, status_code=201, dependencies=mutations)
def register(payload: RegisterRequest, db: DatabaseSession):
    for field, value in ((User.username, payload.username), (User.email, str(payload.email))):
        if db.scalar(select(User.id).where(field == value)) is not None:
            raise HTTPException(status_code=409, detail="Username or email already registered")
    user = User(username=payload.username, email=str(payload.email),
                password_hash=password_hasher.hash(payload.password.get_secret_value()))
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Username or email already registered") from None
    db.refresh(user)
    return user


@router.post("/login", response_model=UserResponse, dependencies=mutations)
def login(payload: LoginRequest, response: Response, db: DatabaseSession):
    user = db.scalar(select(User).where(User.username == payload.username))
    valid = password_hasher.verify(payload.password.get_secret_value(), user.password_hash if user else DUMMY_HASH)
    if user is None or not valid:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    response.set_cookie(
        COOKIE_NAME, create_access_token(user.id), httponly=True,
        secure=settings.AUTH_COOKIE_SECURE, samesite="lax", path="/",
        max_age=settings.AUTH_TOKEN_MINUTES * 60,
    )
    return user


@router.post("/logout", status_code=204, dependencies=mutations)
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/", secure=settings.AUTH_COOKIE_SECURE,
                           httponly=True, samesite="lax")


@router.get("/me", response_model=CurrentUserResponse)
def me(user: Annotated[User, Depends(get_current_user)]):
    return user
