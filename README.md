<div align="center">

# Syllabot

**AI Teaching Assistant — RAG-Based Doubt Resolution**

**Ask any question about your course. Get accurate, cited answers grounded in your actual curriculum — never hallucinated.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/Python-3.11+-3776ab.svg)](https://python.org)
[![React 18](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev)
[![Cost: $0](https://img.shields.io/badge/Cost-%240-green.svg)](#zero-cost)

**Students upload course materials → ask questions → get grounded answers with source citations.**
If the answer isn't in the curriculum, Syllabot says _"I don't know"_ — it never makes things up.

[Get Started](#getting-started) · [Architecture](#architecture) · [API Reference](#api-endpoints) · [How It Works](#how-it-works)

</div>

---

## Highlights

<table>
<tr>
<td width="50%" valign="top">

### RAG-Powered Answers
Every response is grounded in uploaded curriculum content with **source citations** — students can verify where each claim comes from.

### Smart Follow-Ups
Conversational memory rewrites follow-up questions into standalone queries, so _"what about part 2?"_ just works.

### Anti-Hallucination
Similarity-score threshold + strict prompting + mandatory "I don't know" fallback. No off-syllabus answers, ever.

</td>
<td width="50%" valign="top">

### Multi-Provider LLM
**Gemini → Groq → Ollama** fallback chain. Primary on free cloud tiers, fully offline capable with Ollama.

### Per-Session Uploads
Students upload their own PDFs/slides for instant per-session indexing — no admin setup required.

### Feedback Loop
Thumbs up/down on every answer, stored for evaluation and continuous improvement.

</td>
</tr>
</table>

---

## Architecture

```
┌──────────────┐       ┌───────────────┐       ┌───────────────────┐
│              │       │               │       │                   │
│  React Chat  │◀─────▶│   FastAPI     │◀─────▶│   RAG Pipeline    │
│  Frontend    │       │   Backend     │       │   (LangChain)     │
│              │       │               │       │                   │
└──────────────┘       └───────┬───────┘       └─────────┬─────────┘
                               │                         │
                               ▼                         ▼
                        ┌─────────────┐          ┌───────────────┐
                        │  MySQL /    │          │  FAISS Vector │
                        │  SQLite     │          │  Store        │
                        └─────────────┘          └───────┬───────┘
                                                          │
                                                          ▼
                                                 ┌───────────────┐
                                                 │  LLM Provider │
                                                 │  Gemini /     │
                                                 │  Groq / Ollama│
                                                 └───────────────┘
```

---

## Tech Stack

| Layer | Technology | Why |
|:---|:---|:---|
| **LLM (primary)** | Gemini 2.5 Flash | Free tier, fast, high-quality |
| **LLM (fallback)** | Groq (`qwen3.8-27b`) | Free tier, generous rate limits |
| **LLM (offline)** | Ollama (`llama3.2:3b`) | Fully local, no API key needed |
| **Embeddings** | `all-MiniLM-L6-v2` (HuggingFace) | Free, fast on CPU, proven for RAG |
| **Vector Store** | FAISS | Local, no hosted DB, persists to disk |
| **Orchestration** | LangChain | Loaders, splitting, chains, memory |
| **Backend** | FastAPI + SQLAlchemy | Async, auto Swagger docs |
| **Frontend** | React (Vite) | Fast dev server, modern tooling |
| **Database** | MySQL / SQLite | Production / zero-setup dev |

> **Total cost: $0/month** — everything runs on free tiers or local compute. <a id="zero-cost"></a>

---

## Getting Started

### Prerequisites

- **Python** 3.11+
- **Node.js** 18+
- _(Optional)_ [Ollama](https://ollama.com) — for offline LLM
- _(Optional)_ [Groq API key](https://console.groq.com) — free tier
- _(Optional)_ [Google AI Studio API key](https://aistudio.google.com) — free tier

### 1. Clone & Install

```bash
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

### 2. Configure

Copy the env template and fill in your keys:

```bash
cp backend/.env.example backend/.env
```

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

# Database (SQLite by default — no setup needed)
DATABASE_URL=sqlite:///./syllabot.db
# Or for MySQL: mysql+pymysql://root:changeme@localhost:3306/ai_teaching_assistant
```

### 3. Run

```bash
# Terminal 1 — Backend
cd backend
uvicorn api:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Frontend
cd frontend
npm run dev
```

Open **[localhost:5173](http://localhost:5173)** — you're live!

<details>
<summary><b>Optional: MySQL via Docker</b></summary>

The app works out of the box with **SQLite**. For MySQL:

```bash
docker compose up -d
```

Tables are created automatically on backend startup.

</details>

<details>
<summary><b>Optional: Ingest a Curriculum Index</b></summary>

For a global curriculum index shared across all sessions:

```bash
cd backend
python ingest.py --source ./sample_curriculum
```

Per-session uploads are indexed automatically — no manual step needed.

</details>

---

## API Endpoints

| Method | Endpoint | Description |
|:---:|:---|:---|
| `POST` | `/chat` | Send a message → grounded answer with sources |
| `POST` | `/feedback` | Submit thumbs up/down on an answer |
| `POST` | `/upload` | Upload files to a session for instant indexing |
| `GET` | `/session/{id}/files` | List uploaded files for a session |
| `GET` | `/session/{id}/files/{name}/content` | Read an uploaded file's text |
| `DELETE` | `/session/{id}/files/{name}` | Remove a file and rebuild the index |
| `DELETE` | `/session/{id}` | Clean up a session and all its data |
| `GET` | `/health` | Health check |

> Interactive Swagger docs at [localhost:8000/docs](http://localhost:8000/docs)

---

## How It Works

```
  Upload            Ask                 Retrieve          Answer
  ─────────▶       ─────────▶          ─────────▶       ─────────▶
  Student uploads   Question is         Top-k chunks      LLM generates
  PDFs/slides via   condensed from      retrieved from    grounded answer
  the chat UI       conversation        FAISS by cosine   with citations
                    history             similarity
```

1. **Upload** — Student uploads PDFs/slides through the chat UI
2. **Index** — Files are chunked, embedded with MiniLM-L6-v2, stored in a per-session FAISS index
3. **Ask** — Student types a question
4. **Condense** — Follow-up questions are rewritten into standalone queries using conversation history
5. **Retrieve** — Top-k chunks are retrieved from FAISS by cosine similarity
6. **Guard** — If the best chunk's similarity is below threshold → _"I don't know"_ instead of hallucinating
7. **Generate** — LLM generates a grounded answer with mandatory source citations
8. **Log** — Query, answer, latency, and sources are stored in the database

---

## Project Structure

```
Syllabot/
├── backend/
│   ├── api.py               # FastAPI routes
│   ├── config.py            # Centralized settings from .env
│   ├── database.py          # SQLAlchemy setup (MySQL/SQLite)
│   ├── models.py            # ORM models
│   ├── llm.py               # LLM provider abstraction + fallback chain
│   ├── gemini_chat.py       # Custom Gemini wrapper (google-genai SDK)
│   ├── rag_chain.py         # Core RAG pipeline (condense → retrieve → generate)
│   ├── vectorstore.py       # FAISS index operations
│   ├── embeddings.py        # HuggingFace embedding model
│   ├── loaders.py           # Document loaders (PDF, PPTX, MD, TXT)
│   ├── ingest.py            # CLI script to build global FAISS index
│   ├── session_uploads.py   # Per-session file upload + index management
│   ├── generate_test_set.py # Build evaluation Q&A test set from curriculum
│   ├── evaluate.py          # Offline evaluation harness (LLM-as-judge)
│   ├── requirements.txt     # Python dependencies
│   ├── .env.example         # Config template
│   └── sample_curriculum/   # Example curriculum for testing
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Main app component
│   │   ├── api.js           # Backend API client
│   │   └── components/      # Chat UI components
│   ├── package.json
│   └── vite.config.js
├── docs/
│   ├── 01_PRD.md            # Product requirements
│   ├── 02_DESIGN_DOC.md     # Architecture & design decisions
│   └── 03_TECH_STACK.md     # Technology choices & rationale
├── docker-compose.yml       # Optional: MySQL for local dev
└── README.md
```

---

## Documentation

| Document | Description |
|:---|:---|
| [**PRD**](docs/01_PRD.md) | Product requirements, success metrics, scope |
| [**Design Doc**](docs/02_DESIGN_DOC.md) | Architecture, RAG pipeline, evaluation harness |
| [**Tech Stack**](docs/03_TECH_STACK.md) | Technology choices, trade-offs, cost analysis |

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**Built with the goal of making every student's doubts heard — even at 3 AM.**

</div>