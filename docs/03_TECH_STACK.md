# Tech Stack — $0 Cost
## AI Teaching Assistant — RAG-Based Doubt Resolution

Everything below is free (open-source, self-hosted, or generous free tier). No credit card
required for the core build.

| Layer | Choice | Why | Cost |
|---|---|---|---|
| **LLM (generation)** | **Ollama** running `llama3.1:8b` or `mistral:7b` locally | Fully free, unlimited, no API key, runs on a laptop CPU/GPU. Primary/default. | $0 |
| **LLM (optional, faster demo)** | **Groq API** (`llama-3.1-8b-instant` or similar) | Free tier with generous rate limits, very fast inference, no local compute needed for demos. Swappable via config flag. | $0 (free tier) |
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

- **Ollama vs. hosted API:** Ollama needs the dev machine to download a model (~4–8GB) and have
  enough RAM (8GB+ recommended for 7–8B models, quantized). If your machine can't run it well,
  Groq's free tier is the fallback — still $0, just needs internet + an API key (free signup).
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
unstructured
```

## Frontend (core)

```
react
vite
axios
react-markdown   # to render answer text + citations nicely
```

## Local setup prerequisites

1. Install [Ollama](https://ollama.com) → `ollama pull llama3.1:8b` (or a smaller model like
   `phi3:mini` if RAM-constrained).
2. Install MySQL locally (or via Docker: `docker run -e MYSQL_ROOT_PASSWORD=pass -p 3306:3306 mysql`).
3. Python 3.11+, Node 18+.
4. Optional: free Groq API key from console.groq.com for the fast/fallback provider.
