# Product Requirements Document (PRD)
## AI Teaching Assistant — RAG-Based Doubt Resolution

**Version:** 1.0
**Owner:** You
**Status:** Draft for build

---

## 1. Problem Statement

Students studying a fixed curriculum (a course, bootcamp, or textbook) generate a large volume of
repetitive doubts outside class hours. Instructors/TAs cannot be available 24/7, and generic
chatbots (plain ChatGPT-style Q&A) hallucinate or answer outside the syllabus, which erodes trust
and can teach wrong things.

## 2. Goal

Build an AI Teaching Assistant that answers student questions **grounded strictly in curriculum
content** (lecture notes, slides, textbooks, past Q&A) using Retrieval-Augmented Generation (RAG),
available 24/7, with measurable accuracy and hallucination rate — at **zero infrastructure cost**.

## 3. Target Users

- **Primary:** Students in a specific course/curriculum who need instant doubt resolution.
- **Secondary:** Instructors/TAs who want to see what students are struggling with (via logged
  queries + feedback) without manually answering repeat questions.

## 4. Success Metrics

| Metric | Target |
|---|---|
| Answer accuracy (human/LLM-graded, on 500+ eval queries) | ≥ 80% "correct/acceptable" |
| Hallucination rate (answers not grounded in retrieved context) | ≤ 10% |
| p95 response latency | ≤ 6s (local LLM) / ≤ 3s (Groq free tier) |
| Query resolution without human intervention | ≥ 70% of sessions end without escalation |
| Cost | $0/month running cost |

## 5. Scope (V1)

### In scope
- Ingest curriculum content: PDFs, slides (PPTX/PDF export), markdown notes, plain text.
- Chunk + embed content into a local FAISS vector store.
- RAG pipeline: retrieve relevant chunks → construct prompt → generate grounded answer with
  citations (which document/section the answer came from).
- Conversational memory within a session (follow-up questions).
- FastAPI backend exposing chat + feedback endpoints.
- React chat UI (ask question, see answer, see sources, thumbs up/down feedback).
- MySQL (or SQLite for local dev) logging: queries, responses, retrieved sources, latency,
  feedback (thumbs up/down + optional comment).
- Offline evaluation harness: run ≥500 test queries against the pipeline, score accuracy and
  hallucination rate automatically (LLM-as-judge) + report.
- "I don't know" fallback when retrieval confidence is low, instead of hallucinating.

### Out of scope (V1)
- Multi-tenant / multi-course support (single curriculum only).
- User authentication / accounts (anonymous sessions with a client-generated session ID).
- Voice input/output.
- Fine-tuning a model (we only do prompt engineering + RAG).
- Mobile app.

### Explicitly deferred to V2 (nice-to-have, mention as "future work" in resume/interview)
- Multi-course support, admin dashboard for content upload, auth, analytics dashboard for TAs.

## 6. Functional Requirements

1. **Content ingestion**
   - Admin/dev script to load a folder of curriculum files, chunk them (recursive character or
     semantic chunking), embed, and upsert into FAISS with metadata (source file, page/section).
2. **Chat**
   - `POST /chat` — accepts `session_id`, `message`; returns `answer`, `sources[]`, `confidence`.
   - Maintains short conversational history per session (last N turns) for follow-ups.
3. **Feedback**
   - `POST /feedback` — accepts `query_id`, `rating` (up/down), optional `comment`.
4. **Evaluation**
   - Script/notebook that runs a fixed test set of ≥500 Q&A pairs through the pipeline and scores:
     - Retrieval hit rate (did we retrieve the right chunk?)
     - Answer correctness (LLM-as-judge vs. reference answer)
     - Hallucination flag (is every claim traceable to retrieved context?)
5. **Logging**
   - Every query, retrieved chunk IDs, generated answer, latency, and feedback stored in MySQL.

## 7. Non-Functional Requirements

- **Cost:** must run entirely on free tiers / local compute. No paid API keys required by default.
- **Reproducibility:** entire pipeline runnable with one setup script + `.env.example`.
- **Portability:** swappable LLM provider (local Ollama ↔ Groq free tier) via a config flag.
- **Groundedness:** system prompt must instruct the model to answer only from provided context and
  say "I don't know" otherwise — this is the core anti-hallucination guardrail.

## 8. Milestones (suggested build order)

| Phase | Deliverable |
|---|---|
| 1 | Ingestion pipeline: chunk + embed + FAISS index built from sample curriculum |
| 2 | Core RAG chain (LangChain): retriever + prompt template + LLM call, tested in a script |
| 3 | FastAPI backend wrapping the chain, MySQL logging |
| 4 | React chat frontend |
| 5 | Feedback loop + logging dashboard (simple) |
| 6 | Evaluation harness on 500+ queries, accuracy/hallucination report |
| 7 | Polish: README, architecture diagram, demo video/GIF for portfolio |

## 9. Risks

- Local LLM (Ollama) quality may be weaker than GPT-4-class models → mitigate with strong retrieval
  + tight prompt constraints + evaluation-driven prompt iteration.
- Free-tier rate limits (Groq) could throttle demo → default to local Ollama, use Groq only for
  final eval runs.
