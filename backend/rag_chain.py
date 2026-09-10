"""Core RAG chain — condense, retrieve, generate with citations.

Implements the pipeline from docs/02_DESIGN_DOC.md §4:
  1. Condense follow-up questions into standalone queries
  2. Retrieve top-k chunks from FAISS with similarity-score threshold
  3. Token-budget the context window
  4. Generate a grounded answer with strict prompt + source citations
  5. Return {answer, sources, confidence}
"""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from pathlib import Path

from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_core.documents import Document

import config
from llm import get_llm
from vectorstore import load_index

log = logging.getLogger(__name__)


# ── Result container ─────────────────────────────────────────────────────────

@dataclass
class RAGResult:
    """Structured output from the RAG pipeline."""
    answer: str
    sources: list[dict] = field(default_factory=list)
    confidence: str = "high"
    condensed_query: str = ""
    latency_ms: float = 0.0
    retrieved_chunk_ids: list[str] = field(default_factory=list)


# ── Prompt templates ─────────────────────────────────────────────────────────

CONDENSE_SYSTEM = (
    "You are a question rewriter. Given the conversation history and a new "
    "follow-up question, rewrite the follow-up into a standalone question that "
    "can be understood without the conversation history. If the question is "
    "already standalone, return it unchanged. Output ONLY the rewritten "
    "question — no explanation, no quotes."
)

ANSWER_SYSTEM = """\
You are a patient, encouraging teaching assistant for a university course. Your role is to \
answer student questions STRICTLY using the provided curriculum context below.

RULES:
1. Answer ONLY using the information in the context blocks. If the context does not contain \
enough information to answer the question, say: "I don't have enough information in the \
curriculum materials to answer that question. Please ask your instructor for help."
2. Every factual claim MUST cite its source using [Source: filename] notation.
3. Do NOT make up, infer, or hallucinate information that is not in the context.
4. Be clear, concise, and encouraging in tone. Explain concepts step by step.
5. If the question is about a topic partially covered, answer what you can from the context \
and clearly state what is not covered.

CONTEXT:
{context}

CONVERSATION HISTORY:
{history}

QUESTION: {question}

ANSWER (with [Source: filename] citations):"""


# ── Token budgeting ───────────────────────────────────────────────────────────

# Rough chars-per-token ratio for English text (~4 chars/token)
_CHARS_PER_TOKEN = 4


def _estimate_tokens(text: str) -> int:
    """Rough token estimate without loading a tokenizer."""
    return len(text) // _CHARS_PER_TOKEN


def _build_context(chunks: list[Document], scores: list[float],
                   max_tokens: int = 3000) -> str:
    """Assemble retrieved chunks into a context string within a token budget.

    Chunks are already sorted by relevance (best first). We include them in
    order and drop the lowest-relevance chunks if we exceed the budget.
    """
    budget_tokens = max_tokens
    parts: list[str] = []

    for doc, score in zip(chunks, scores):
        source = doc.metadata.get("source_file", "unknown")
        section = doc.metadata.get("section_title", "")
        header = f"[Source: {source}" + (f" > {section}]" if section else "]")
        block = f"{header}\n{doc.page_content.strip()}"

        block_tokens = _estimate_tokens(block)
        if block_tokens <= budget_tokens:
            parts.append(block)
            budget_tokens -= block_tokens
        else:
            # Try to fit a truncated version
            if budget_tokens > 50:
                truncated = block[:budget_tokens * _CHARS_PER_TOKEN]
                parts.append(truncated + "\n[...truncated]")
            break

    return "\n\n---\n\n".join(parts) if parts else "(No relevant context found)"


def _format_history(history: list[dict], max_turns: int = 6) -> str:
    """Format conversation history for the prompt.

    Keeps the last ``max_turns`` turns verbatim. Older turns are collapsed
    into a single summary line so the context window is not blown.
    """
    if not history:
        return "(No previous conversation)"

    recent = history[-max_turns:]
    lines = []
    for turn in recent:
        role = "Student" if turn.get("role") == "user" else "TA"
        lines.append(f"{role}: {turn.get('content', '')}")

    if len(history) > max_turns:
        older_count = len(history) - max_turns
        lines.insert(0, f"(...{older_count} earlier message(s) omitted...)")

    return "\n".join(lines)


# ── Core pipeline ────────────────────────────────────────────────────────────

def condense_question(question: str, history: list[dict],
                      provider: Optional[str] = None) -> str:
    """Rewrite a follow-up into a standalone question using the LLM.

    If there's no history or only one turn, returns the question unchanged.
    """
    if not history or len(history) < 2:
        return question

    # Build a compact history for the condense prompt
    history_text = _format_history(history)
    user_messages = [m for m in history if m.get("role") == "user"]

    # If the latest user message IS the question, we need context from before it
    if user_messages and user_messages[-1].get("content") == question:
        prior = user_messages[:-1]
        if not prior:
            return question
        history_text = _format_history(
            [m for m in history if m is not history[-1]]
        )

    llm = get_llm(provider)
    messages = [
        SystemMessage(content=CONDENSE_SYSTEM),
        HumanMessage(content=f"Conversation history:\n{history_text}\n\nNew question: {question}"),
    ]

    try:
        response = llm.invoke(messages)
        condensed = response.content.strip()
        # Sanity check: if the LLM returned something wildly different in length,
        # fall back to the original question
        if len(condensed) > len(question) * 5 or len(condensed) < 3:
            log.warning("Condense result suspiciously different — using original question")
            return question
        log.info("Condensed: %r -> %r", question, condensed)
        return condensed
    except Exception:
        log.exception("Question condensation failed — using original question")
        return question


def _distance_to_cosine(distance: float) -> float:
    """Convert a FAISS L2 distance into a cosine similarity.

    Valid because our embeddings are L2-normalised (see embeddings.py). For two
    unit vectors ``a`` and ``b``, the squared L2 distance is ``2*(1 - cos(a,b))``,
    so ``cos = 1 - dist^2 / 2``. Higher cosine = more similar.
    """
    return 1.0 - (distance * distance) / 2.0


def retrieve_with_threshold(
    query: str,
    top_k: int | None = None,
    index_path: Path | None = None,
) -> tuple[list[Document], list[float], bool]:
    """Retrieve chunks from FAISS and check the similarity threshold.

    Returns:
        (documents, scores, passed_threshold)

    ``scores`` are cosine similarities (higher = better, range roughly -1..1).
    ``passed_threshold`` is True if the best (highest) similarity meets or
    exceeds ``config.SIMILARITY_THRESHOLD``. If False, the documents list may
    still be returned for logging purposes, but the caller should fall back to
    the "I don't know" response rather than generating an answer.

    Args:
        query: The search query.
        top_k: Number of results to return.
        index_path: Optional path to a session-specific FAISS index directory.
                    If None, uses the global index.
    """
    k = top_k if top_k is not None else config.RETRIEVAL_TOP_K
    vs = load_index(index_path)
    store_dir = index_path or config.VECTORSTORE_DIR
    if vs is None:
        raise FileNotFoundError(
            f"No FAISS index at {store_dir}. Run `python ingest.py` first."
        )

    # similarity_search_with_score returns results sorted by distance ascending
    # (best first). Convert the L2 distances to cosine similarities.
    results = vs.similarity_search_with_score(query, k=k)
    if not results:
        return [], [], False

    docs = [doc for doc, _ in results]
    scores = [_distance_to_cosine(score) for _, score in results]

    # Best match is the HIGHEST cosine similarity
    best_score = scores[0]
    passed = best_score >= config.SIMILARITY_THRESHOLD

    log.info(
        "Retrieved %d chunks, best cosine=%.4f, threshold=%.2f, passed=%s",
        len(docs), best_score, config.SIMILARITY_THRESHOLD, passed,
    )
    return docs, scores, passed


def generate_answer(
    question: str,
    context: str,
    history: list[dict],
    provider: Optional[str] = None,
) -> str:
    """Generate a grounded answer using the LLM + strict prompt template."""
    llm = get_llm(provider)
    history_text = _format_history(history)

    prompt = ANSWER_SYSTEM.format(
        context=context,
        history=history_text,
        question=question,
    )

    messages = [HumanMessage(content=prompt)]
    response = llm.invoke(messages)
    return response.content.strip()


# ── Orchestrator ─────────────────────────────────────────────────────────────

DONT_KNOW_RESPONSE = (
    "I don't have enough information in the curriculum materials to answer "
    "that question. This topic may be outside the scope of the course content. "
    "Please check with your instructor for guidance."
)


def rag_answer(
    question: str,
    history: list[dict] | None = None,
    index_path: Path | None = None,
    provider: Optional[str] = None,
) -> RAGResult:
    """Run the full RAG pipeline and return a structured result.

    This is the main entry point for Phase 2. Call this from query.py,
    api.py, or any other consumer.

    Args:
        question: The student's question.
        history: Optional conversation history for context.
        index_path: Optional path to a session-specific FAISS index.
                    If None, uses the global index.
        provider: Optional LLM provider override ("gemini", "groq", "ollama").
    """
    t0 = time.time()
    history = history or []

    # Step 1: Condense follow-up into standalone question
    condensed = condense_question(question, history, provider=provider)

    # Step 2: Retrieve chunks with similarity threshold check
    try:
        docs, scores, passed = retrieve_with_threshold(condensed, index_path=index_path)
    except FileNotFoundError as exc:
        return RAGResult(
            answer=str(exc),
            confidence="error",
            condensed_query=condensed,
            latency_ms=(time.time() - t0) * 1000,
        )

    # Step 3: Check threshold — primary anti-hallucination guardrail
    if not passed:
        log.warning("Below similarity threshold — returning fallback response")
        return RAGResult(
            answer=DONT_KNOW_RESPONSE,
            confidence="low",
            condensed_query=condensed,
            latency_ms=(time.time() - t0) * 1000,
            retrieved_chunk_ids=[
                doc.metadata.get("source_file", "") for doc in docs
            ],
        )

    # Step 4: Build context with token budget
    context = _build_context(docs, scores, max_tokens=3000)

    # Step 5: Generate grounded answer
    answer = generate_answer(question, context, history, provider=provider)

    # Step 6: Build source citations
    sources = []
    seen = set()
    for doc, score in zip(docs, scores):
        source_file = doc.metadata.get("source_file", "unknown")
        source_path = doc.metadata.get("source_path", "")
        key = f"{source_file}:{doc.page_content[:80]}"
        if key not in seen:
            seen.add(key)
            sources.append({
                "file": source_file,
                "path": source_path,
                "score": round(score, 4),
                "excerpt": doc.page_content[:200].strip(),
            })

    latency = (time.time() - t0) * 1000

    # Determine confidence from best cosine similarity (higher = better).
    # High when comfortably above threshold; low near/at the threshold.
    best_score = scores[0] if scores else -1.0
    if best_score >= config.SIMILARITY_THRESHOLD * 1.5:
        confidence = "high"
    elif best_score >= config.SIMILARITY_THRESHOLD:
        confidence = "medium"
    else:
        confidence = "low"

    return RAGResult(
        answer=answer,
        sources=sources,
        confidence=confidence,
        condensed_query=condensed,
        latency_ms=round(latency, 2),
        retrieved_chunk_ids=[doc.metadata.get("source_file", "") for doc in docs],
    )
