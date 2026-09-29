from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.ai import ChatRequest, ChatResponse
from ..services.ai import generate_reply
from ..services.ai_context import load_context


router = APIRouter(prefix="/api/ai", tags=["AI Study Assistant"])


@router.post("/chat", response_model=ChatResponse)
def chat(request: ChatRequest, db: Annotated[Session, Depends(get_db)]) -> ChatResponse:
    # A synchronous route runs the blocking SDK call in FastAPI's worker pool.
    context = load_context(db, request.context_sources)
    return ChatResponse(reply=generate_reply(request.message, request.history, context))
