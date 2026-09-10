# Syllabot

**AI-powered Teaching Assistant that answers student questions grounded strictly in course curriculum using RAG (Retrieval-Augmented Generation).**

Students upload their course materials (PDFs, slides, notes) and ask questions. Syllabot retrieves the most relevant curriculum chunks and generates accurate, cited answers — or honestly says "I don't know" when the content isn't covered. No hallucinations, no off-syllabus answers.

---

## Features

- **RAG-powered answers** — every response is grounded in uploaded curriculum content with source citations
- **Multi-provider LLM** — Gemini (primary) → Groq → Ollama fallback chain, all configurable
- **Per-session file uploads** — students upload their own PDFs/slides for instant indexing
- **Conversational memory** — follow-up questions are understood via query condensation
- **Anti-hallucination guardrails** — similarity threshold + strict prompting + "I don't know" fallback
- **Feedback loop** — thumbs up/down on answers, stored for evaluation
- **Zero infrastructure cost** — runs on free tiers and local compute

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌──────────────────┐
│ React Chat  │ ───▶ │ FastAPI      │ ───▶ │ RAG Pipeline      │
│ Frontend    │ ◀─── │ Backend      │ ◀─── │ (LangChain)       │
└─────────────┘      └──────┬───────┘      └────────┬──────────┘
                             │                        │
                             ▼                        ▼
                      ┌─────────────┐         ┌───────────────┐
                      │   MySQL /   │         │  FAISS Vector │
                      │   SQLite    │         │  Store        │
                      └─────────────┘         └───────┬───────┘
                                                       │
                                                       ▼
                                              ┌───────────────┐
                                              │  LLM Provider │
                                              │  Gemini /     │
                                              │  Groq / Ollama│
                                              └───────────────┘
```

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Gemini 2.5 Flash (primary), Groq (fallback), Ollama (offline) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (local, CPU) |
| Vector Store | FAISS (local, `faiss-cpu`) |
| Orchestration | LangChain |
| Backend | FastAPI + SQLAlchemy |
| Frontend | React (Vite) |
| Database | MySQL (prod) / SQLite (dev) |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- (Optional) [Ollama](https://ollama.com) for offline LLM — `ollama pull llama3.2:3b`
- (Optional) [Groq API key](https://console.groq.com) — free tier
- (Optional) [Google AI Studio API key](https://aistudio.google.com) — free tier

### Installation

```bash
# Clone
git clone https://github.com/swarnkarkuldeep/Syllabot.git
cd Syllabot

# Backend
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### Configuration

Create `backend/.env` from the template (see `backend/.env.example`):

```env
# LLM Provider: "gemini", "groq", or "ollama"
LLM_PROVIDER=gemini

# Gemini (primary)
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash

# Groq (fallback)
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=qwen/qwen3.8-27b

# Ollama (offline fallback)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Embeddings
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2

# Retrieval
RETRIEVAL_TOP_K=5
SIMILARITY_THRESHOLD=0.05

# Chunking
CHUNK_SIZE=800
CHUNK_OVERLAP=120

# Database
DATABASE_URL=mysql+pymysql://root:changeme@localhost:3306/ai_teaching_assistant
# For local dev without MySQL, use:
# DATABASE_URL=sqlite:///./syllabot.db
```

### Database (optional)

The app works out of the box with **SQLite** (set the `DATABASE_URL` in your `.env` accordingly). For full MySQL, spin one up with Docker:

```bash
docker compose up -d
```

The healthcheck waits for MySQL to be ready; tables are created automatically on backend startup.

### Running

```bash
# Terminal 1 — Backend
cd backend
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Ingesting Curriculum (optional)

For a global curriculum index (shared across all sessions):

```bash
cd backend
python ingest.py --source ./sample_curriculum
```

Per-session uploads are indexed automatically — no manual ingestion needed.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/chat` | Send a message, get a grounded answer with sources |
| `POST` | `/feedback` | Submit thumbs up/down feedback on an answer |
| `POST` | `/upload` | Upload files to a session for instant indexing |
| `GET` | `/session/{id}/files` | List uploaded files for a session |
| `GET` | `/session/{id}/files/{name}/content` | Read an uploaded file's text |
| `DELETE` | `/session/{id}/files/{name}` | Remove a file and rebuild the index |
| `DELETE` | `/session/{id}` | Clean up a session and all its data |
| `GET` | `/health` | Health check |

Swagger docs available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Project Structure

```
Syllabot/
├── backend/
│   ├── api.py              # FastAPI routes
│   ├── config.py           # Centralized settings from .env
│   ├── database.py         # SQLAlchemy setup (MySQL/SQLite)
│   ├── models.py           # ORM models
│   ├── llm.py              # LLM provider abstraction + fallback chain
│   ├── gemini_chat.py      # Custom Gemini wrapper (google-genai SDK)
│   ├── rag_chain.py        # Core RAG pipeline (condense → retrieve → generate)
│   ├── vectorstore.py      # FAISS index operations
│   ├── embeddings.py       # HuggingFace embedding model
│   ├── loaders.py          # Document loaders (PDF, PPTX, MD, TXT)
│   ├── ingest.py           # CLI script to build global FAISS index
│   ├── session_uploads.py  # Per-session file upload + index management
│   ├── generate_test_set.py# Build an evaluation Q&A test set from curriculum
│   ├── evaluate.py         # Offline evaluation harness (LLM-as-judge)
│   ├── requirements.txt    # Python dependencies
│   ├── .env.example        # Config template (copy to .env)
│   └── sample_curriculum/  # Example curriculum for testing the pipeline
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main app component
│   │   ├── api.js          # Backend API client
│   │   └── components/     # Chat UI components
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── 01_PRD.md           # Product requirements
│   ├── 02_DESIGN_DOC.md    # Architecture & design decisions
│   └── 03_TECH_STACK.md    # Technology choices & rationale
├── docker-compose.yml      # Optional: MySQL for local dev
└── README.md
```

## How It Works

1. **Upload** — student uploads PDFs/slides through the chat UI
2. **Index** — files are chunked, embedded with MiniLM-L6-v2, and stored in a per-session FAISS index
3. **Ask** — student types a question
4. **Condense** — follow-up questions are rewritten into standalone queries using conversation history
5. **Retrieve** — top-k chunks are retrieved from FAISS by cosine similarity
6. **Guard** — if the best chunk's similarity is below threshold, return "I don't know" instead of hallucinating
7. **Generate** — the LLM generates a grounded answer with mandatory source citations
8. **Log** — the query, answer, latency, and sources are stored in the database

## License

MIT
