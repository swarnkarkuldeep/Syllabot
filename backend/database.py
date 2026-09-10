"""MySQL connection and session management via SQLAlchemy.

Provides a reusable engine, session factory, and Base declarative class.
Call ``init_db()`` once at startup to create all tables.
"""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

import config

log = logging.getLogger(__name__)

# ── Engine & session factory ──────────────────────────────────────────────────

def _make_engine():
    """Build the SQLAlchemy engine, adapting pool options to the dialect.

    SQLite (used for tests / quick local runs) has no connection pool, so the
    MySQL-specific pool args must be omitted for it. Everything else gets the
    full pool configuration with pre-ping/recycle for reliable long-running
    connections.
    """
    pool_kwargs = {}
    if not config.DATABASE_URL.startswith("sqlite"):
        pool_kwargs = {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_pre_ping": True,   # reconnect stale connections
            "pool_recycle": 3600,
        }
    return create_engine(
        config.DATABASE_URL,
        echo=False,  # set True for SQL debug logging
        **pool_kwargs,
    )


engine = _make_engine()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""
    pass


# ── Dependency for FastAPI ────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a DB session and closes it after use.

    Usage::

        @app.post("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Startup helper ────────────────────────────────────────────────────────────

def init_db() -> None:
    """Create all tables that don't yet exist.

    Safe to call multiple times (CREATE IF NOT EXISTS semantics).
    """
    # Import models so Base.metadata knows about them
    import models  # noqa: F401  — triggers model registration

    Base.metadata.create_all(bind=engine)
    log.info("Database tables created / verified.")


# ── Convenience context manager ──────────────────────────────────────────────

@contextmanager
def get_session() -> Generator[Session, None, None]:
    """Standalone context manager for scripts that need a DB session outside
    FastAPI (e.g. evaluation harness, CLI tools)."""
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
