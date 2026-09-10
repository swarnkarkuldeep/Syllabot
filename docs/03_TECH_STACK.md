# Tech Stack — $0 Cost
## AI Teaching Assistant — RAG-Based Doubt Resolution

Everything below is free (open-source, self-hosted, or generous free tier). No credit card
required for the core build.

| Layer | Choice | Why | Cost |
|---|---|---|---|
| **LLM (generation, primary)** | **Gemini 2.5 Flash** via the modern `google-genai` SDK | Free tier, fast, high-quality, supports both legacy `AIza` and new `AQ.` API keys. Primary/default provider. | $0 (free tier) |
| **LLM (fallback)** | **Groq API** (`qwen/qwen3.8-27b` or similar) | Free tier with generous rate limits, very fast inference. Used as fallback if Gemini is unreachable. | $0 (free tier) |
| **LLM (offline, last resort)** | **Ollama** running `llama3.2:3b` locally | Fully free, unlimited, no API key, runs on a laptop CPU/GPU. Keeps the stack functional fully offline. | $0 |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` (HuggingFace, local) | Free, fast on CPU, no API cost, well-proven for RAG. | $0 |
| **Orchestration** | **LangChain** (Python) | Handles loaders, text splitting, retriever chains, memory, condense-question pattern out of the box — matches resume line. | $0 |
| **Vector store** | **FAISS** (local, `faiss-cpu`) | Free, no hosted vector DB needed, fast enough for a single-curriculum dataset, persists to disk. | $0 |
| **Backend** | **FastAPI** (Python) | Free, async, auto docs (Swagger), matches resume line. | $0 |
| **Frontend** | **React** (Vite) | Free, standard, matches resume line. | $0 |
| **Database** | **MySQL** (local via Docker, or PlanetScale/Aiven/Railway free tier for a hosted demo) | Matches resume line ("structured MySQL schema"). SQLite as an even simpler local-dev fallback if preferred. | $0 |
| **Evaluation / LLM-as-judge** | Same local Ollama model (or Groq free tier) used as the judge | No paid eval API needed. | $0 |
| **Backend hosting (optional, for a live demo link)** | **Render free tier** or **Railway free tier** or **Fly.io free tier** | Enough to host FastAPI + SQLite/MySQL for a portfolio demo. | $0 |
| **Frontend hosting** | **Vercel** or **Netlify** free tier | Standard free static/React hosting. | $0 |
| **Vector store hosting (if not local)** | Not needed — FAISS ships as a file, no server | — | $0 |
| **Version control / portfolio** | **GitHub** (public repo) | Matches "§ GitHub" in resume line. | $0 |

## Key free-tier decisions and trade-offs

- **Gemini vs. Groq vs. Ollama:** Gemini free tier is the primary provider — fast, high-quality,
  and the `google-genai` SDK supports the new `AQ.` key format. Groq is the automatic fallback if
  Gemini is unreachable (still $0, needs a free API key). Ollama is the offline last resort —
  needs the model downloaded (~2–4GB for `llama3.2:3b`) and enough RAM to run it locally.
- **FAISS vs. Pinecone/Weaviate/Chroma Cloud:** FAISS avoids any hosted vector DB account/limits
  entirely, since the corpus (one curriculum) is small enough to fit in memory/disk easily.
- **MySQL vs. SQLite:** SQLite is zero-setup and totally free but doesn't literally match "MySQL"
  on the resume. Recommendation: use MySQL via a free local Docker container for development, and
  either keep it local for the demo or use one free-tier hosted MySQL (PlanetScale/Aiven/Railway)
  if you want a live public demo link.

## requirements.txt (core)

```
langchain
langchain-community
langchain-huggingface
langchain-ollama
langchain-groq
google-genai      # modern Gemini SDK (AQ. key support)
faiss-cpu
sentence-transformers
fastapi
uvicorn[standard]
pydantic
sqlalchemy
pymysql
python-dotenv
ollama            # python client for local Ollama server
groq              # optional, only if using Groq fallback
pypdf
python-pptx
```

## Frontend (core)

```
react
vite
axios
react-markdown   # to render answer text + citations nicely
```

## Local setup prerequisites

1. Optional: [Google AI Studio](https://aistudio.google.com) API key for the Gemini provider
   (supports both `AIza` and `AQ.` key formats).
2. Optional: [Groq](https://console.groq.com) API key for the fallback provider.
3. Optional: [Ollama](https://ollama.com) → `ollama pull llama3.2:3b` for fully offline use.
4. Install MySQL locally (or via Docker: `docker run -e MYSQL_ROOT_PASSWORD=pass -p 3306:3306 mysql`).
5. Python 3.11+, Node 18+.
