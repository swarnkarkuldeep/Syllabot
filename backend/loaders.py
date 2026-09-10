"""Document loaders for curriculum content (MD, TXT, PDF, PPTX)."""

from __future__ import annotations

import logging
from pathlib import Path

from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredPowerPointLoader,
)
from langchain_core.documents import Document

log = logging.getLogger(__name__)


def load_documents(source_dir: Path) -> list[Document]:
    """Load all supported curriculum files from *source_dir*.

    Supported extensions: .md, .txt, .pdf, .pptx
    Returns a flat list of LangChain Document objects with page-level metadata.

    Raises ``FileNotFoundError`` if *source_dir* does not exist.
    """
    if not source_dir.exists():
        raise FileNotFoundError(f"Source directory does not exist: {source_dir}")

    if not source_dir.is_dir():
        raise NotADirectoryError(f"Source path is not a directory: {source_dir}")

    documents: list[Document] = []
    skipped = 0
    files = sorted(source_dir.rglob("*"))

    for filepath in files:
        if not filepath.is_file():
            continue

        ext = filepath.suffix.lower()
        loader = _LOADERS.get(ext)
        if loader is None:
            log.debug("skip (unsupported): %s", filepath.name)
            skipped += 1
            continue

        log.info("load: %s", filepath.name)
        try:
            docs = _invoke_loader(loader, filepath)

            # Reject loaders that returned nothing — treat as a soft error
            if not docs:
                log.warning("empty result from loader for %s — skipping", filepath.name)
                skipped += 1
                continue

            # Attach source_file metadata if not already present
            for doc in docs:
                doc.metadata.setdefault("source_file", filepath.name)
                doc.metadata.setdefault("source_path", str(filepath))

            documents.extend(docs)
        except Exception:
            # Do NOT silently swallow — log the traceback and skip the file
            # so the rest of the corpus is not polluted by partial data.
            log.exception("FAILED to load %s — skipping this file", filepath.name)
            skipped += 1

    if not documents and skipped == 0:
        log.warning("No supported files found in %s", source_dir)

    log.info("Loaded %d document(s) from %d file(s) (%d skipped).",
             len(documents), len(documents) + skipped, skipped)
    return documents


def _invoke_loader(loader: object, filepath: Path) -> list[Document]:
    """Call a LangChain loader class *or* a plain function loader."""
    # Plain function loaders (our _load_text) are callables but not classes
    if callable(loader) and not isinstance(loader, type):
        return loader(filepath)

    # LangChain loader class: instantiate then .load()
    loader_instance = loader(str(filepath))  # type: ignore[union-attr]
    return loader_instance.load()


# ── Custom loaders ───────────────────────────────────────────────────────────

def _load_text(filepath: Path) -> list[Document]:
    """Load a plain-text or markdown file as a single Document."""
    text = filepath.read_text(encoding="utf-8", errors="replace")
    return [
        Document(
            page_content=text,
            metadata={"source_file": filepath.name},
        )
    ]


# ── Extension → loader mapping ───────────────────────────────────────────────
# Placed at module bottom so _load_text is already defined when the dict is built.

_LOADERS: dict[str, object] = {
    ".md": _load_text,
    ".txt": _load_text,
    ".pdf": PyPDFLoader,
    ".pptx": UnstructuredPowerPointLoader,
}
