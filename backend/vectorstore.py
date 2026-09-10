"""FAISS vector-store operations: build, load, and search."""

from __future__ import annotations

import logging
import shutil
from pathlib import Path

from langchain_community.vectorstores import FAISS
from langchain_core.documents import Document

import config
from embeddings import get_embeddings

log = logging.getLogger(__name__)


def _ensure_dir(target: Path | None = None) -> None:
    d = target or config.VECTORSTORE_DIR
    d.mkdir(parents=True, exist_ok=True)


def build_index(
    documents: list[Document],
    output_dir: Path | None = None,
) -> FAISS:
    """Build a FAISS index from *documents* and persist it to *output_dir*.

    If *output_dir* is not given, defaults to ``config.VECTORSTORE_DIR``.
    The directory is created if it doesn't exist.
    """
    dest = output_dir or config.VECTORSTORE_DIR
    _ensure_dir(dest)

    embeddings = get_embeddings()
    print("Building FAISS index ...")
    vectorstore = FAISS.from_documents(documents, embeddings)

    # Persist
    vectorstore.save_local(str(dest))
    index_file = dest / "index.faiss"
    print(f"Index saved to {index_file}")
    return vectorstore


def load_index(path: Path | None = None) -> FAISS | None:
    """Load the persisted FAISS index. Returns ``None`` if it doesn't exist.

    Args:
        path: Directory containing the FAISS index. Defaults to ``config.VECTORSTORE_DIR``.

    SECURITY NOTE: ``allow_dangerous_deserialization=True`` is required because
    LangChain's FAISS integration serialises metadata via ``pickle``. This is
    safe **only** when the directory is trusted (i.e. written by our own code).
    If you are in a multi-tenant or untrusted environment, restrict filesystem
    permissions on the vectorstore directory.
    """
    store_dir = path or config.VECTORSTORE_DIR
    index_file = store_dir / "index.faiss"
    if not index_file.exists():
        return None

    embeddings = get_embeddings()
    return FAISS.load_local(
        str(store_dir),
        embeddings,
        allow_dangerous_deserialization=True,  # required by LangChain FAISS
    )


def get_retriever(top_k: int | None = None, path: Path | None = None):
    """Return a LangChain retriever backed by the persisted FAISS index."""
    k = top_k if top_k is not None else config.RETRIEVAL_TOP_K
    vs = load_index(path)
    store_dir = path or config.VECTORSTORE_DIR
    if vs is None:
        raise FileNotFoundError(
            f"No FAISS index at {store_dir}. Run `python ingest.py` first."
        )
    return vs.as_retriever(search_kwargs={"k": k})


def similarity_search_with_score(query: str, k: int | None = None, path: Path | None = None):
    """Run a similarity search and return (docs, scores) tuples."""
    k = k if k is not None else config.RETRIEVAL_TOP_K
    vs = load_index(path)
    store_dir = path or config.VECTORSTORE_DIR
    if vs is None:
        raise FileNotFoundError(
            f"No FAISS index at {store_dir}. Run `python ingest.py` first."
        )
    return vs.similarity_search_with_score(query, k=k)


def clear_index() -> None:
    """Delete the persisted index directory."""
    if config.VECTORSTORE_DIR.exists():
        shutil.rmtree(config.VECTORSTORE_DIR)
        log.info("Index directory removed: %s", config.VECTORSTORE_DIR)
