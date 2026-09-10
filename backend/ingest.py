#!/usr/bin/env python3
"""CLI script to build the FAISS vector index from curriculum files.

Usage:
    python ingest.py                  # rebuild from CURRICULUM_DIR (default: sample_curriculum)
    python ingest.py --source ./my_course
    python ingest.py --clear          # delete the existing index only

The pipeline:
  1. Load all supported files (MD, TXT, PDF, PPTX) from the source directory.
  2. Split documents into chunks using RecursiveCharacterTextSplitter.
  3. Embed every chunk with sentence-transformers/all-MiniLM-L6-v2.
  4. Build a FAISS index and persist to disk (VECTORSTORE_DIR).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import shutil
import tempfile
import time
from pathlib import Path

from langchain_text_splitters import RecursiveCharacterTextSplitter

import config
from loaders import load_documents
from vectorstore import build_index, clear_index

log = logging.getLogger(__name__)


# ── Helpers ──────────────────────────────────────────────────────────────────

def _source_hash(source_dir: Path) -> str:
    """Deterministic hash of all source files so we can detect stale indexes.

    NOTE: This reads file bytes independently of the document loaders. For
    large corpora the hash could be computed during loading and cached on the
    Document objects, but for the typical single-curriculum size the extra I/O
    is negligible.
    """
    h = hashlib.sha256()
    for f in sorted(source_dir.rglob("*")):
        if f.is_file():
            h.update(f.read_bytes())
    return h.hexdigest()[:16]


def _store_metadata(source_dir: Path, n_chunks: int, elapsed: float) -> dict:
    """Persist ingest metadata so downstream code can verify freshness.

    Returns the metadata dict for caller convenience.
    """
    meta = {
        "source_dir": str(source_dir),
        "source_hash": _source_hash(source_dir),
        "n_chunks": n_chunks,
        "embedding_model": config.EMBEDDING_MODEL,
        "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "elapsed_seconds": round(elapsed, 2),
    }
    config.VECTORSTORE_DIR.mkdir(parents=True, exist_ok=True)
    meta_path = config.VECTORSTORE_DIR / "ingest_meta.json"
    meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    return meta


# ── Main ─────────────────────────────────────────────────────────────────────

def ingest(source_dir: Path | None = None) -> None:
    """Full ingest pipeline: load -> chunk -> embed -> persist.

    Uses an atomic-swap strategy: builds the new index into a temp directory
    first, then replaces the old index only on success. This prevents losing
    a working index if the build fails partway through.
    """
    src = source_dir or config.CURRICULUM_DIR
    if not src.exists():
        print(f"Error: source directory '{src}' does not exist.")
        return

    print("=== Ingestion pipeline ===")
    print(f"Source     : {src}")
    print(f"Embeddings : {config.EMBEDDING_MODEL}")
    print(f"Chunk size : {config.CHUNK_SIZE}  |  overlap: {config.CHUNK_OVERLAP}")
    print()

    # 1. Load
    print("--- Step 1: Loading documents ---")
    documents = load_documents(src)
    if not documents:
        print("No documents found. Nothing to do.")
        return

    # 2. Chunk
    print("\n--- Step 2: Splitting into chunks ---")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=config.CHUNK_SIZE,
        chunk_overlap=config.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_documents(documents)
    print(f"Split into {len(chunks)} chunks.")

    # Show a brief sample
    if chunks:
        sample = chunks[0].page_content[:120].replace("\n", " ")
        print(f'  First chunk preview: "{sample}..."')
        print(f"  First chunk metadata: {chunks[0].metadata}")

    # 3-4. Embed + persist (atomic swap)
    print("\n--- Step 3-4: Embedding & building FAISS index ---")
    t0 = time.time()

    # Build into a temp directory first — if anything fails, the old index
    # remains untouched.
    tmp_dir = Path(tempfile.mkdtemp(prefix="faiss_build_"))
    try:
        build_index(chunks, output_dir=tmp_dir)

        # Build succeeded — atomic swap: remove old, move new into place
        if config.VECTORSTORE_DIR.exists():
            shutil.rmtree(config.VECTORSTORE_DIR)
        shutil.move(str(tmp_dir), str(config.VECTORSTORE_DIR))
        print(f"Index swapped into {config.VECTORSTORE_DIR}")
    except Exception:
        # Build failed — clean up the temp dir and leave old index intact
        shutil.rmtree(tmp_dir, ignore_errors=True)
        print("\n!!! Index build FAILED — previous index left intact.", flush=True)
        raise
    finally:
        elapsed = time.time() - t0

    # 5. Metadata
    meta = _store_metadata(src, len(chunks), elapsed)
    print("\n--- Done ---")
    print(f"Chunks indexed : {meta['n_chunks']}")
    print(f"Source hash    : {meta['source_hash']}")
    print(f"Elapsed        : {meta['elapsed_seconds']}s")
    print(f"Index location : {config.VECTORSTORE_DIR}")


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Build FAISS vector index from curriculum files.")
    parser.add_argument(
        "--source", type=Path, default=None,
        help=f"Directory containing curriculum files (default: {config.CURRICULUM_DIR})",
    )
    parser.add_argument(
        "--clear", action="store_true",
        help="Delete the existing index and exit.",
    )
    args = parser.parse_args()

    if args.clear:
        clear_index()
        return

    ingest(args.source)


if __name__ == "__main__":
    main()
