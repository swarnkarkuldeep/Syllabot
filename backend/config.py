"""Centralised settings loaded from .env with sane defaults."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# Canonical .env lives at the repo root (one level above backend/), per project
# convention. Load it explicitly so config is identical regardless of the
# working directory the server happens to be launched from.
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv()  # also surface any cwd-scoped .env (won't override root vars)


def _int(name: str, default: str) -> int:
    """Read an integer env var with a clear error on bad values."""
    raw = os.getenv(name, default)
    try:
        return int(raw)
    except (ValueError, TypeError):
        print(
            f"Error: env var {name}={raw!r} is not a valid integer.",
            file=sys.stderr,
        )
        sys.exit(1)


def _float(name: str, default: str) -> float:
    """Read a float env var with a clear error on bad values."""
    raw = os.getenv(name, default)
    try:
        return float(raw)
    except (ValueError, TypeError):
        print(
            f"Error: env var {name}={raw!r} is not a valid float.",
            file=sys.stderr,
        )
        sys.exit(1)


def _path(name: str, default: str) -> Path:
    """Read a path env var, resolving relative to BASE_DIR."""
    raw = os.getenv(name, default)
    p = Path(raw)
    if not p.is_absolute():
        p = BASE_DIR / p
    return p


# ── LLM ──────────────────────────────────────────────────────────────────────

LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "ollama")

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL: str = os.getenv("OLLAMA_MODEL", "llama3.2:3b")

GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# ── Embeddings ───────────────────────────────────────────────────────────────

EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Compute device for embeddings: "auto" = CUDA if available, else CPU.
# Or force "cpu" / "cuda" explicitly.
EMBEDDING_DEVICE: str = os.getenv("EMBEDDING_DEVICE", "auto")

# ── Paths ────────────────────────────────────────────────────────────────────

VECTORSTORE_DIR: Path = _path("VECTORSTORE_DIR", "./vectorstore")
CURRICULUM_DIR: Path = _path("CURRICULUM_DIR", "./sample_curriculum")

# ── Upload ───────────────────────────────────────────────────────────────────

UPLOAD_DIR: Path = _path("UPLOAD_DIR", "./uploads")
MAX_UPLOAD_SIZE_MB: int = _int("MAX_UPLOAD_SIZE_MB", "20")
ALLOWED_EXTENSIONS: set[str] = {
    ".pdf", ".txt", ".md", ".docx", ".csv", ".json", ".html"
}

# ── Chunking ─────────────────────────────────────────────────────────────────

CHUNK_SIZE: int = _int("CHUNK_SIZE", "800")
CHUNK_OVERLAP: int = _int("CHUNK_OVERLAP", "120")

# ── Retrieval ────────────────────────────────────────────────────────────────

RETRIEVAL_TOP_K: int = _int("RETRIEVAL_TOP_K", "5")

# Minimum cosine similarity for a chunk to be considered relevant. Higher value
# = stricter (fewer hallucinations but more "I don't know" answers). Measured
# against real queries in Phase 2: relevant content scores ~0.26-0.67, off-topic
# scores below 0.
SIMILARITY_THRESHOLD: float = _float("SIMILARITY_THRESHOLD", "0.20")

# ── MySQL ────────────────────────────────────────────────────────────────────

DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:changeme@localhost:3306/ai_teaching_assistant",
)

# ── Backend ──────────────────────────────────────────────────────────────────

API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
API_PORT: int = _int("API_PORT", "8000")
