# AI Teaching Assistant — RAG-Based Doubt Resolution

A portfolio project demonstrating a fully local, zero-cost RAG (Retrieval-Augmented Generation)
pipeline that answers student questions **grounded strictly in curriculum content** — with source
citations, conversational memory, and a measurable evaluation harness.

---

## Architecture

```mermaid
flowchart LR
    subgraph Frontend["React Chat UI (Vite)"]
        A[Message List]
        B[Input Box]
        C[Sources Panel]
        D[Feedback Buttons]
    end

    subgraph Backend["FastAPI Backend"]
        E["POST /chat<br/>(session_id, message)"]
        F["POST /feedback<br/>(query_id, rating)"]
        G[MySQL<br/>queries, sessions, feedback]
    end

    subgraph RAG["LangChain RAG Chain"]
        H[Condense Question]
        I[Retrieve from FAISS]
        J{Similarity<br/>above threshold?}
        K[Generate Grounded Answer]
        L["I don't know"]
    end

    subgraph Infra["Infrastructure"]
        M[FAISS Vector Store<br/>local file]
        N[Local Embeddings<br/>all-MiniLM-L6-v2]
        O["LLM (Ollama<br/>or Groq free tier)"]
    end

    A --> E
    B --> E
    D --> F
    E --> G
    E --> H
    H --> I
    I --> J
    J -->|"Yes (high confidence)"| K
    J -->|"No (below threshold)"| L
    K --> C
    L --> C
    I -.-> M
    M -.-> N
    K -.-> O
```

---

## Why This Project?

Generic AI chatbots hallucinate and answer outside the syllabus. This project solves that with:

- **Strictly grounded answers** — the LLM is told to only answer from retrieved context
- **Confidence threshold** — if nothing relevant is found, the system says "I don't know" instead of guessing
- **Source citations** — every answer includes which document/section it came from
- **$0 running cost** — local Ollama, local embeddings, local FAISS, free-tier MySQL
- **Measurable quality** — an evaluation harness with 500+ test queries measuring accuracy, hallucination rate, and latency

---

## Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| LLM (default) | **Ollama** — `llama3.1:8b` running locally | $0 |
| LLM (optional) | **Groq** free tier — `llama-3.1-8b-instant` | $0 (free tier) |
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace, local CPU) | $0 |
| Orchestration | **LangChain** (Python) | $0 |
| Vector Store | **FAISS** (local file) | $0 |
| Backend | **FastAPI** + Uvicorn | $0 |
| Frontend | **React** (Vite) + Axios | $0 |
| Database | **MySQL** (local Docker) | $0 |
| Eval Judge | Same local LLM (or Groq) | $0 |

---

## Quick Start

### Prerequisites

1. **Python 3.11+** (tested on 3.11 and 3.12)
2. **Node.js 18+** and npm
3. **[Ollama](https://ollama.com)** installed and running locally
4. **Docker** (for MySQL) — or install MySQL directly

### 1. Clone and set up the backend

```bash
git clone <your-repo-url>
cd Syllabot/backend

# Create and activate a virtual environment
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file (edit if needed)
copy .env.example .env   # Windows
cp .env.example .env     # macOS / Linux
```

### 2. Pull an Ollama model (first time only)

```bash
ollama pull llama3.1:8b
# On low-RAM machines, use a smaller model instead:
# ollama pull phi3:mini
```

### 3. Start MySQL (Docker)

```bash
docker run -d \
  --name mysql-local \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=ai_teaching_assistant \
  -p 3306:3306 \
  mysql:8
```

### 4. Run the ingestion pipeline

```bash
cd backend
python ingest.py
```

This loads the sample curriculum, chunks and embeds it, and builds a FAISS index in
`backend/vectorstore/`.

### 5. Ask a question

```bash
python query.py "What is a Python list comprehension?"
```

You should see a grounded answer with source citations printed to the terminal.

### 6. Start the API server

```bash
python -m uvicorn api:app --reload --host 0.0.0.0 --port 8000
```

Interactive API docs available at **http://localhost:8000/docs**.

### 7. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Project Structure

```
backend/
├── requirements.txt          # Python dependencies
├── .env.example              # Config template — copy to .env
├── config.py                 # Centralised settings from .env
├── ingest.py                 # CLI: load curriculum → chunk → embed → FAISS
├── loaders.py                # PDF / PPTX / MD / TXT document loaders
├── embeddings.py             # Sentence-transformers wrapper (cached)
├── vectorstore.py            # FAISS index: build, load, search, retriever
├── llm.py                    # Ollama / Groq provider abstraction
├── rag_chain.py              # Condense-question → retrieve → grounded answer
├── query.py                  # CLI: ask a question, print answer + sources
├── api.py                    # FastAPI: POST /chat, POST /feedback
├── models.py                 # SQLAlchemy models (MySQL schema)
├── database.py               # MySQL session/engine setup
├── generate_test_set.py      # Auto-generate 500+ eval Q&A pairs from chunks
├── evaluate.py               # Run eval harness → CSV + markdown report
├── sample_curriculum/        # Sample files (test the pipeline without real content)
│   ├── python_basics.md
│   ├── data_structures.md
│   └── sql_fundamentals.md
└── vectorstore/              # Persisted FAISS index (gitignored)

frontend/
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    └── api.js                 # Axios calls to FastAPI backend

docs/
├── 01_PRD.md
├── 02_DESIGN_DOC.md
└── 03_TECH_STACK.md
```

---

## Configuration

All configuration is in `backend/.env` (see `.env.example` for defaults).

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `ollama` | `ollama` (local) or `groq` (free tier) |
| `OLLAMA_MODEL` | `llama3.1:8b` | Ollama model to use |
| `GROQ_MODEL` | `llama-3.1-8b-instant` | Groq model (if using Groq) |
| `EMBEDDING_MODEL` | `sentence-transformers/all-MiniLM-L6-v2` | HuggingFace embedding model |
| `CHUNK_SIZE` | `800` | Max characters per chunk |
| `CHUNK_OVERLAP` | `120` | Overlap between chunks (prevents splitting mid-concept) |
| `RETRIEVAL_TOP_K` | `5` | Number of chunks to retrieve per query |
| `SIMILARITY_THRESHOLD` | `0.3` | Below this → "I don't know" (anti-hallucination gate) |
| `DATABASE_URL` | `mysql+pymysql://root:password@localhost:3306/ai_teaching_assistant` | MySQL connection string |

---

## Anti-Hallucination Guardrails

This project uses four layers of protection against hallucinated answers:

1. **System prompt** — the LLM is instructed to answer only from the provided context blocks
2. **Similarity threshold** — if no retrieved chunk meets the confidence threshold, generation is
   skipped entirely and a canned "I don't know" response is returned
3. **Source citations** — every answer includes which chunks/documents it drew from; the UI displays
   these so users can verify claims themselves
4. **Evaluation harness** — a 500+ query test set with LLM-as-judge scoring continuously measures
   hallucination rate, accuracy, and retrieval hit rate

---

## Evaluation

Run the full evaluation harness against the 500+ test query set:

```bash
cd backend
python generate_test_set.py   # Generate test set from ingested chunks
python evaluate.py            # Run evaluation → eval_results.csv + summary.md
```

Metrics reported:
- **Retrieval hit rate** — was the expected source chunk in the top-k retrieved?
- **Answer correctness** — LLM-as-judge grades correct / partially correct / incorrect
- **Hallucination rate** — percentage of answers with unsupported claims
- **Latency** — p50 / p95 response time

---

## Using Groq Instead of Ollama

For faster inference without local GPU (or for demo purposes):

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Set in `.env`:
   ```
   LLM_PROVIDER=groq
   GROQ_API_KEY=gsk_...
   ```
3. No other changes needed — the provider abstraction handles it.

---

## Future Work (V2 ideas)

- Multi-course support with course switching
- Admin dashboard for uploading new curriculum content
- User authentication and per-user query history
- Analytics dashboard for instructors (popular questions, weak topics)
- Fine-tuning the model on domain-specific Q&A pairs

---

## License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) for details.
