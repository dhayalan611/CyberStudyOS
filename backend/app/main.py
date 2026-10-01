from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .database import engine, get_db
from .config import settings
from .routers.auth import router as auth_router
from .routers.ai import router as ai_router
from .routers.certifications import router as certifications_router
from .routers.courses import router as courses_router
from .routers.ctf_challenges import router as ctf_router
from .routers.labs import router as labs_router
from .routers.notes import router as notes_router
from .routers.projects import router as projects_router
from .routers.topics import router as topics_router
from .routers.tasks import router as tasks_router
from .routers.study_sessions import router as study_sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        yield
    finally:
        engine.dispose()


app = FastAPI(title="CyberStudy OS API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type"],
)
app.include_router(auth_router)


@app.exception_handler(RequestValidationError)
async def safe_validation_errors(request, exc):
    if request.url.path.startswith("/api/auth/"):
        # FastAPI's default errors echo raw input, including rejected passwords.
        return JSONResponse(status_code=422, content={"detail": [
            {"loc": error["loc"], "msg": error["msg"], "type": error["type"]}
            for error in exc.errors()
        ]})
    return await request_validation_exception_handler(request, exc)


@app.middleware("http")
async def private_cache_control(request, call_next):
    response = await call_next(request)
    # Cookie-authenticated data must not be reused by browser/shared caches
    # after logout or when another user signs in on the same browser.
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


app.include_router(courses_router)
app.include_router(ctf_router)
app.include_router(certifications_router)
app.include_router(labs_router)
app.include_router(notes_router)
app.include_router(projects_router)
app.include_router(topics_router)
app.include_router(ai_router)
app.include_router(tasks_router)
app.include_router(study_sessions_router)


@app.get("/")
def read_root():
    return {"message": "CyberStudy OS API"}


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/db-health")
def database_health_check(db: Annotated[Session, Depends(get_db)]):
    try:
        db.execute(text("SELECT 1")).scalar_one()
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503, detail="Database connection failed"
        ) from None
    return {"database": "connected"}
