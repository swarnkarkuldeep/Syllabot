# Design Doc
## AI Teaching Assistant — RAG-Based Doubt Resolution

---

## 1. Context

Students need grounded, curriculum-specific answers instead of generic LLM output. The core design
challenge is **groundedness**: every answer must be traceable to retrieved curriculum content, and
the system must know when to say "I don't know" rather than hallucinate. Everything else (backend,
frontend, DB) exists to support this loop reliably and to let us *measure* whether it's working
(evaluation harness).

## 2. High-Level Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│ React Chat  │ ───▶ │ FastAPI      │ ───▶ │ LangChain RAG     │
│ Frontend    │ ◀─── │ Backend      │ ◀─── │ Chain             │
└─────────────┘      └──────┬───────┘      └────────┬──────────┘
                             │                        │
                             ▼                        ▼
                      ┌─────────────┐         ┌───────────────┐
                      │   MySQL      │         │  FAISS Vector │
                      │ (logs,       │         │  Store        │
                      │  feedback)   │         │ (curriculum   │
                      └─────────────┘         │  embeddings)  │
                                                └───────┬───────┘
                                                         │
                                                         ▼
                                                ┌───────────────┐
                                                │ LLM Provider   │
                                                │ Gemini / Groq /│
                                                │ Ollama         │
                                                └───────────────┘
```

## 3. Ingestion Pipeline (offline, run once per curriculum update)

1. **Load** curriculum files (PDF/PPTX/MD/TXT) with LangChain document loaders.
2. **Chunk** using `RecursiveCharacterTextSplitter` (~500–800 tokens, 10–15% overlap) — chosen
   because curriculum text has natural paragraph/heading structure; overlap prevents cutting a
   concept mid-explanation.
3. **Embed** each chunk with a free local embedding model (`sentence-transformers/all-MiniLM-L6-v2`
   via HuggingFace — runs on CPU, no API cost).
4. **Store** vectors + metadata (`source_file`, `page_number`, `section_title`, `chunk_id`) in a
   local **FAISS** index, persisted to disk (`vectorstore/index.faiss`).
5. Re-run ingestion whenever curriculum content changes; index is versioned by a hash of source
   files so stale indexes are detected.

## 4. RAG Query Pipeline (online, per user message)

1. User message arrives with `session_id`.
2. Load last N turns of conversation history for that session (short-term memory).
3. **Condense** the question: if it's a follow-up ("what about part 2?"), rewrite it into a
   standalone question using the LLM + history (standard "condense question" pattern), so
   retrieval isn't polluted by pronouns/context-free fragments.
4. **Retrieve** top-k (k=4–6) chunks from FAISS via similarity search (cosine on MiniLM embeddings).
5. **Filter by relevance score** — if the best chunk's similarity is below a threshold, skip
   generation and return a canned "I don't know / this seems outside the curriculum" response.
   This is the primary anti-hallucination guardrail.
6. **Construct prompt** using a strict template (see §5) that includes only retrieved chunks as
   context, plus the conversation history and the question.
7. **Generate** answer via the configured LLM (Gemini free tier, or Groq, or local Ollama).
8. **Post-process**: attach source citations (file + section) from the chunks actually used.
9. **Log** the full turn (query, condensed query, retrieved chunk ids, answer, latency) to MySQL.
10. Return `{answer, sources, confidence}` to the frontend.

## 5. Prompt Engineering Strategy

Two templates:

- **Condense-question prompt** — rewrites a follow-up into a standalone question using chat
  history. Keeps retrieval accurate across multi-turn conversations.
- **Answer-generation prompt** — a strict system prompt that:
  - Instructs the model to answer *only* using the provided context blocks.
  - Requires it to explicitly say it doesn't know if the context is insufficient.
  - Requires citing which source chunk(s) support each claim.
  - Sets tone/persona (patient, encouraging TA — not a search engine).
  - Caps answer length to keep responses focused (context-window and UX budget).

**Context-window management:**
- Token-budget the retrieved chunks (e.g., cap total context at ~3,000 tokens) so we never exceed
  the local model's context window, prioritizing the top-scoring chunks first.
- Truncate/summarize chat history after N turns (e.g., keep last 6 turns verbatim, summarize older
  turns into a single "conversation so far" line) so long sessions don't blow the budget.
- If retrieved context + history + question exceeds budget, drop lowest-relevance chunks first.

## 6. Evaluation Harness Design

- **Test set:** ≥500 (question, reference_answer, expected_source) triples, built from curriculum
  content (can be partly auto-generated by prompting an LLM over each chunk to produce a Q&A pair,
  then spot-checked).
- **Metrics computed per run:**
  - *Retrieval hit rate*: was the expected source chunk in the top-k retrieved?
  - *Answer correctness*: LLM-as-judge compares generated answer vs. reference answer → score
    correct / partially correct / incorrect.
  - *Hallucination rate*: LLM-as-judge checks if every factual claim in the answer is supported by
    the retrieved context (not just plausible-sounding).
  - *Latency*: p50/p95 response time.
- **Output:** a CSV + a summary report (markdown/HTML) with aggregate scores — this becomes the
  evidence behind the "500+ test queries" claim and a good README/portfolio artifact.

## 7. Data Model (MySQL)

- `sessions(session_id, created_at)`
- `queries(query_id, session_id, raw_query, condensed_query, answer, retrieved_chunk_ids JSON,
  confidence, latency_ms, created_at)`
- `feedback(feedback_id, query_id, rating ENUM('up','down'), comment, created_at)`
- `eval_runs(run_id, run_at, num_queries, accuracy, hallucination_rate, avg_latency_ms)` — stores
  results of each evaluation harness run for tracking improvement over time.

## 8. Anti-Hallucination Guardrails (summary)

1. Strict "answer only from context" system prompt.
2. Similarity-score threshold → fallback to "I don't know" instead of generating.
3. Citations required in every answer; UI shows sources so users can verify.
4. Evaluation harness continuously measures hallucination rate so prompt/retrieval changes are
   validated against a number, not vibes.

## 9. Frontend UX

- Simple chat interface: message list, input box, "sources" expandable panel under each AI answer,
  thumbs up/down on each answer.
- Loading state while retrieval + generation happens.
- Session persists in browser (localStorage `session_id`) so refresh doesn't lose context.
