"""FastAPI backend — POST /chat, POST /feedback.

Run:
    uvicorn api:app --reload --host 0.0.0.0 --port 8000

Swagger docs auto-generated at http://localhost:8000/docs.
"""

from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

from fastapi import Depends, FastAPI, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import config
from database import get_db, init_db
from models import ConfidenceLevel, Feedback, FeedbackRating, Query, Session as DBSession
from rag_chain import rag_answer
import session_uploads

log = logging.getLogger(__name__)


# ── Lifespan (startup / shutdown) ────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create DB tables on startup."""
    init_db()
    yield


app = FastAPI(
    title="Syllabot — AI Teaching Assistant",
    description=(
        "RAG-based doubt resolution API for university courses. "
        "Ask curriculum questions and get grounded answers with source citations."
    ),
    version="0.1.0",
    lifespan=lifespan,
)


# ── Request / Response schemas ───────────────────────────────────────────────

class ChatRequest(BaseModel):
    session_id: str = Field(
        ...,
        description="Client-generated session UUID. Persist in localStorage for multi-turn.",
        examples=["abc123"],
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Student's question or follow-up.",
        examples=["What is a stack?"],
    )
    provider: Optional[str] = Field(
        None,
        description="LLM provider override: 'gemini', 'groq', or 'ollama'. "
                    "Omit to use the server default (LLM_PROVIDER env var).",
        examples=["gemini"],
    )


class SourceItem(BaseModel):
    file: str
    path: str = ""
    score: float
    excerpt: str = ""


class ChatResponse(BaseModel):
    answer: str
    sources: list[SourceItem]
    confidence: str
    query_id: int
    condensed_query: str = ""
    latency_ms: float = 0.0


class FeedbackRequest(BaseModel):
    query_id: int = Field(..., description="The query_id from a /chat response.")
    rating: FeedbackRating = Field(..., description="Thumbs up or down.")
    comment: Optional[str] = Field(
        None, max_length=1000, description="Optional free-text feedback."
    )


class FeedbackResponse(BaseModel):
    feedback_id: int
    message: str = "Feedback recorded."


class HealthResponse(BaseModel):
    status: str = "ok"
    provider: str = ""
    version: str = "0.1.0"


class UploadResponse(BaseModel):
    filename: str
    message: str
    indexed: bool
    file_count: int = 0


class SessionFilesResponse(BaseModel):
    session_id: str
    files: list[dict]


class CleanupResponse(BaseModel):
    session_id: str
    message: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse, tags=["health"])
def health_check():
    """Lightweight health check — confirms the API is up."""
    return HealthResponse(provider=config.LLM_PROVIDER)


@app.post("/chat", response_model=ChatResponse, tags=["chat"])
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    """Ask a curriculum question.

    The pipeline:
      1. Condenses follow-ups into standalone queries (via LLM).
      2. Retrieves relevant curriculum chunks from FAISS.
      3. Falls back to "I don't know" if similarity is below threshold.
      4. Generates a grounded answer with source citations.
      5. Logs everything to the `queries` table.
    """
    # Ensure session exists (auto-create on first message)
    session = db.query(DBSession).filter(DBSession.session_id == req.session_id).first()
    if session is None:
        session = DBSession(session_id=req.session_id)
        db.add(session)
        db.flush()

    # Load recent conversation history for this session
    recent_queries = (
        db.query(Query)
        .filter(Query.session_id == req.session_id)
        .order_by(Query.created_at.desc())
        .limit(6)
        .all()
    )
    history: list[dict] = []
    for q in reversed(recent_queries):
        history.append({"role": "user", "content": q.raw_query})
        history.append({"role": "assistant", "content": q.answer})

    # Use session-specific index if uploaded files exist
    session_index = session_uploads.get_session_index_dir(req.session_id)
    index_path: Path | None = session_index if session_index.exists() else None

    # Run RAG pipeline with per-request provider override
    result = rag_answer(req.message, history=history, index_path=index_path,
                        provider=req.provider)

    # Persist the query
    query_record = Query(
        session_id=req.session_id,
        raw_query=req.message,
        condensed_query=result.condensed_query,
        answer=result.answer,
        retrieved_chunk_ids=result.retrieved_chunk_ids,
        confidence=result.confidence,
        latency_ms=result.latency_ms,
    )
    db.add(query_record)
    db.commit()
    db.refresh(query_record)

    log.info(
        "query_id=%d session=%s confidence=%s latency=%.0fms",
        query_record.query_id, req.session_id, result.confidence, result.latency_ms,
    )

    return ChatResponse(
        answer=result.answer,
        sources=[SourceItem(**s) for s in result.sources],
        confidence=result.confidence,
        query_id=query_record.query_id,
        condensed_query=result.condensed_query,
        latency_ms=result.latency_ms,
    )


@app.post("/upload", response_model=UploadResponse, tags=["upload"])
def upload_file(
    session_id: str = Form(...),
    file: UploadFile = File(...),
):
    """Upload a course file for a session.

    The file is stored per-session and indexed into a private FAISS index
    so subsequent questions in that session retrieve from the user's own
    material instead of (or in addition to) the global curriculum.

    Uploaded files are deleted when the session is cleaned up via
    ``DELETE /session/{session_id}``.
    """
    # Validate extension before reading content
    ext = Path(file.filename or "").suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"File type '{ext}' not allowed. "
                f"Supported: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}"
            ),
        )

    # Read content with a size guard
    content = file.file.read()
    if len(content) > config.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Max size is {config.MAX_UPLOAD_SIZE_MB} MB.",
        )

    # Save file to the session's upload directory
    try:
        session_uploads.save_uploaded_file(session_id, file.filename, content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    # Build/rebuild the session index so new content is searchable immediately
    try:
        session_uploads.build_session_index(session_id)
        indexed = True
    except FileNotFoundError as exc:
        # No other processable files yet — file saved but not indexed
        indexed = False
    except Exception as exc:
        log.error("Index build failed for session %s: %s", session_id, exc)
        indexed = False

    files = session_uploads.list_session_files(session_id)

    log.info("Upload: session=%s file=%s indexed=%s", session_id, file.filename, indexed)

    return UploadResponse(
        filename=file.filename,
        message=f"Uploaded {file.filename}. Uploaded files are now searchable in this session.",
        indexed=indexed,
        file_count=len(files),
    )


@app.get("/session/{session_id}/files", response_model=SessionFilesResponse, tags=["upload"])
def list_session_files(session_id: str):
    """List uploaded files for a session."""
    files = session_uploads.list_session_files(session_id)
    return SessionFilesResponse(session_id=session_id, files=files)


@app.delete("/session/{session_id}", response_model=CleanupResponse, tags=["upload"])
def delete_session(session_id: str):
    """Delete a session's uploaded files and private index.

    Called by the frontend when a chat session ends. All user-uploaded
    material is permanently removed.
    """
    session_uploads.cleanup_session(session_id)
    log.info("Session cleanup: session=%s", session_id)

    return CleanupResponse(
        session_id=session_id,
        message="Session uploads and index cleaned up.",
    )


@app.post("/feedback", response_model=FeedbackResponse, tags=["feedback"])
def submit_feedback(req: FeedbackRequest, db: Session = Depends(get_db)):
    """Record thumbs-up/down feedback on a query answer.

    Optionally include a free-text comment explaining the rating.
    """
    query = db.query(Query).filter(Query.query_id == req.query_id).first()
    if query is None:
        raise HTTPException(status_code=404, detail=f"query_id {req.query_id} not found.")

    fb = Feedback(
        query_id=req.query_id,
        rating=req.rating,
        comment=req.comment,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)

    log.info(
        "feedback query_id=%d rating=%s", req.query_id, req.rating.value,
    )

    return FeedbackResponse(
        feedback_id=fb.feedback_id,
        message="Feedback recorded.",
    )


# ── Entry point for direct `python api.py` ───────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api:app",
        host=config.API_HOST,
        port=config.API_PORT,
        reload=True,
    )
