"""SQLAlchemy ORM models for MySQL.

Schema per docs/02_DESIGN_DOC.md §7:
  - sessions    (session_id, created_at)
  - queries     (query_id, session_id FK, raw_query, condensed_query, answer,
                 retrieved_chunk_ids JSON, confidence, latency_ms, created_at)
  - feedback    (feedback_id, query_id FK, rating ENUM, comment, created_at)
  - eval_runs   (run_id, run_at, num_queries, accuracy, hallucination_rate,
                 avg_latency_ms)
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# ── Helpers ──────────────────────────────────────────────────────────────────

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Enums ────────────────────────────────────────────────────────────────────

class FeedbackRating(str, enum.Enum):
    UP = "up"
    DOWN = "down"


class ConfidenceLevel(str, enum.Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    ERROR = "error"


# ── Models ───────────────────────────────────────────────────────────────────

class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(String(64), primary_key=True)  # UUID from client
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    # Relationships
    queries = relationship("Query", back_populates="session", cascade="all, delete-orphan")


class Query(Base):
    __tablename__ = "queries"

    query_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(
        String(64),
        ForeignKey("sessions.session_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    raw_query = Column(Text, nullable=False)
    condensed_query = Column(Text, nullable=False, default="")
    answer = Column(Text, nullable=False)
    retrieved_chunk_ids = Column(JSON, nullable=False, default=list)
    confidence = Column(
        Enum(ConfidenceLevel, native_enum=False, length=20),
        nullable=False,
        default=ConfidenceLevel.HIGH,
    )
    latency_ms = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    # Relationships
    session = relationship("Session", back_populates="queries")
    feedback_entries = relationship("Feedback", back_populates="query", cascade="all, delete-orphan")


class Feedback(Base):
    __tablename__ = "feedback"

    feedback_id = Column(Integer, primary_key=True, autoincrement=True)
    query_id = Column(
        Integer,
        ForeignKey("queries.query_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating = Column(
        Enum(FeedbackRating, native_enum=False, length=10),
        nullable=False,
    )
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    # Relationships
    query = relationship("Query", back_populates="feedback_entries")


class EvalRun(Base):
    __tablename__ = "eval_runs"

    run_id = Column(Integer, primary_key=True, autoincrement=True)
    run_at = Column(DateTime, default=_utcnow, nullable=False)
    num_queries = Column(Integer, nullable=False, default=0)
    accuracy = Column(Float, nullable=True)            # fraction 0..1
    hallucination_rate = Column(Float, nullable=True)  # fraction 0..1
    avg_latency_ms = Column(Float, nullable=True)
