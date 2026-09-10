"""Per-session file upload and private FAISS index management.

Each session gets its own isolated upload directory and FAISS index.
When a session ends or is cleaned up, all uploaded files and the
index are deleted.
"""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

import config
from embeddings import get_embeddings
from loaders import load_documents
from vectorstore import build_index

# Reuse the same chunking config as ingest.py so session indexes have the
# same retrieval granularity as the global curriculum index.
from langchain_text_splitters import RecursiveCharacterTextSplitter

log = logging.getLogger(__name__)


def _session_dir(session_id: str) -> Path:
    """Return the upload directory for a session."""
    return config.UPLOAD_DIR / session_id


def _session_index_dir(session_id: str) -> Path:
    """Return the FAISS index directory for a session."""
    return config.UPLOAD_DIR / session_id / "index"


def get_session_index_dir(session_id: str) -> Path:
    """Public accessor for session index directory."""
    return _session_index_dir(session_id)


def get_session_upload_dir(session_id: str) -> Path:
    """Public accessor for session upload directory."""
    return _session_dir(session_id)


def save_uploaded_file(session_id: str, filename: str, content: bytes) -> Path:
    """Save an uploaded file to the session's upload directory.

    Returns the path to the saved file.
    Raises ValueError if file extension is not allowed.
    """
    ext = Path(filename).suffix.lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        raise ValueError(
            f"File type '{ext}' not allowed. "
            f"Supported: {', '.join(sorted(config.ALLOWED_EXTENSIONS))}"
        )

    upload_dir = _session_dir(session_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / filename
    file_path.write_bytes(content)

    log.info("Saved upload: session=%s file=%s", session_id, filename)
    return file_path


def build_session_index(session_id: str) -> FAISS:
    """Build a FAISS index from all files in the session's upload directory.

    Returns the built FAISS vectorstore.
    """
    session_dir = _session_dir(session_id)
    index_dir = _session_index_dir(session_id)

    # Collect all allowed files in the session directory (excluding index/)
    files = [
        f for f in session_dir.iterdir()
        if f.is_file()
        and f.suffix.lower() in config.ALLOWED_EXTENSIONS
        and not f.name.startswith(".")  # skip hidden files
    ]

    if not files:
        raise FileNotFoundError(f"No processable files found in session {session_id}")

    log.info(
        "Building session index: session=%s files=%d",
        session_id, len(files),
    )

    # Load documents from the session directory. Unsupported files (e.g. the
    # already-built index/*.faiss) are skipped automatically.
    documents = load_documents(session_dir)

    if not documents:
        raise ValueError(f"Could not extract any content from files in session {session_id}")

    # Chunk documents to match global index granularity — without this,
    # whole-document embeddings exceed the model's token limit and produce
    # garbage vectors that fail similarity search.
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)

    log.info("Session %s: %d doc(s) → %d chunk(s)", session_id, len(documents), len(chunks))

    # Build FAISS index to the session's index directory
    embeddings = get_embeddings()
    vectorstore = FAISS.from_documents(chunks, embeddings)
    index_dir.mkdir(parents=True, exist_ok=True)
    vectorstore.save_local(str(index_dir))

    log.info(
        "Session index built: session=%s chunks=%d path=%s",
        session_id, len(documents), index_dir,
    )

    return vectorstore


def load_session_index(session_id: str) -> FAISS | None:
    """Load the FAISS index for a session. Returns None if no index exists."""
    from vectorstore import load_index
    return load_index(_session_index_dir(session_id))


def cleanup_session(session_id: str) -> bool:
    """Delete all uploaded files and index for a session.

    Returns True if cleanup occurred, False if session dir didn't exist.
    """
    session_dir = _session_dir(session_id)
    if session_dir.exists():
        shutil.rmtree(session_dir)
        log.info("Cleaned up session: session=%s path=%s", session_id, session_dir)
        return True
    return False


def list_session_files(session_id: str) -> list[dict]:
    """List uploaded files in a session (excluding index directory)."""
    session_dir = _session_dir(session_id)
    if not session_dir.exists():
        return []

    files = []
    for f in session_dir.iterdir():
        if f.is_file() and not f.name.startswith("."):
            files.append({
                "filename": f.name,
                "size_bytes": f.stat().st_size,
                "extension": f.suffix.lower(),
            })
    return files
