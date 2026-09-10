"""Wrapper around the local sentence-transformers embedding model."""

from functools import lru_cache

import torch

from langchain_huggingface import HuggingFaceEmbeddings

import config


def _detect_device() -> str:
    """Pick the best available compute device (cuda > cpu)."""
    if config.EMBEDDING_DEVICE == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    return config.EMBEDDING_DEVICE


@lru_cache(maxsize=1)
def get_embeddings() -> HuggingFaceEmbeddings:
    """Return a cached HuggingFaceEmbeddings instance."""
    device = _detect_device()
    if device == "cuda":
        print(f"[INFO] Embeddings on CUDA GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("[INFO] Embeddings on CPU (no CUDA available).")
    return HuggingFaceEmbeddings(
        model_name=config.EMBEDDING_MODEL,
        model_kwargs={"device": device},
        encode_kwargs={"normalize_embeddings": True},
    )
