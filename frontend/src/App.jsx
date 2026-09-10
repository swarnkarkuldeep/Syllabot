import { useEffect, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Greeting from "./components/Greeting";
import FileUpload from "./components/FileUpload";
import { deleteSession, sendMessage, submitFeedback } from "./api";
import "./App.css";

const SESSION_KEY = "syllabot_session_id";
const PROVIDER_KEY = "syllabot_provider";
const THEME_KEY = "syllabot_theme";

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newSessionId() {
  const id = `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStoredTheme() {
  return localStorage.getItem(THEME_KEY) || "dark";
}

function getStoredProvider() {
  return localStorage.getItem(PROVIDER_KEY) || "";
}

export default function App() {
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(getStoredProvider);
  const [theme, setTheme] = useState(getStoredTheme);
  const [leftOpen, setLeftOpen] = useState(false);
  const endRef = useRef(null);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const toggleTheme = () => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  };

  const handleNewChat = async () => {
    if (sessionId) {
      try {
        await deleteSession(sessionId);
      } catch {
        // Non-fatal
      }
    }
    setSessionId(newSessionId());
    setMessages([]);
    setError(null);
  };

  const handleSend = async (text) => {
    setMessages((m) => [
      ...m,
      { role: "user", content: text, createdAt: timeNow() },
    ]);
    setError(null);
    setLoading(true);

    try {
      const data = await sendMessage(sessionId, text, provider || undefined);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer,
          sources: data.sources || [],
          confidence: data.confidence,
          latency_ms: data.latency_ms,
          query_id: data.query_id,
          createdAt: timeNow(),
        },
      ]);
    } catch (err) {
      const detail =
        err?.response?.data?.detail || err?.message || "Something went wrong.";
      setError(
        `Unable to reach the assistant — ${detail}. Make sure the backend is running on :8000.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (queryId, rating, message) => {
    const turningOff = message.feedback === rating;
    setMessages((m) =>
      m.map((msg) =>
        msg.query_id === queryId
          ? { ...msg, feedback: turningOff ? null : rating }
          : msg,
      ),
    );
    try {
      await submitFeedback(queryId, rating, turningOff ? null : "from chat UI");
    } catch {
      setMessages((m) =>
        m.map((msg) =>
          msg.query_id === queryId ? { ...msg, feedback: null } : msg,
        ),
      );
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="header">
        <div className="header__brand">
          <span className="header__icon" aria-hidden>📖</span>
          <span className="header__name">Syllabot</span>
          <span className="header__subtitle">AI Study Companion</span>
        </div>

        <div className="header__actions">
          <select
            className="provider-select"
            value={provider}
            onChange={(e) => {
              const val = e.target.value;
              setProvider(val);
              if (val) {
                localStorage.setItem(PROVIDER_KEY, val);
              } else {
                localStorage.removeItem(PROVIDER_KEY);
              }
            }}
            title="Choose LLM provider"
            aria-label="LLM provider"
          >
            <option value="">Default</option>
            <option value="gemini">Gemini</option>
            <option value="groq">Groq</option>
            <option value="ollama">Ollama</option>
          </select>

          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>

          {hasMessages && (
            <button
              type="button"
              className="theme-toggle"
              onClick={handleNewChat}
              title="Start a fresh conversation"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      {/* ── Split Layout ──────────────────────────────────────────────── */}
      <div className="split">
        {/* Left Panel: Documents */}
        <aside className={`panel-left${leftOpen ? " is-open" : ""}`}>
          <div className="panel-left__header">
            <span className="panel-left__title">Documents</span>
          </div>
          <div className="panel-left__body">
            <FileUpload sessionId={sessionId} />
          </div>
          <div className="panel-left__status">
            <span className="status-dot status-dot--ok" aria-hidden />
            <span>Session: {sessionId.slice(0, 12)}…</span>
          </div>
        </aside>

        {/* Right Panel: Chat */}
        <section className="panel-right">
          <main className="chat">
            {!hasMessages && <Greeting onPick={handleSend} />}

            <div className="chat__thread">
              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} onFeedback={handleFeedback} />
              ))}

              {loading && (
                <div className="msg msg--ta">
                  <div className="msg__card-outer">
                    <div className="msg__card msg__card--pending">
                      <span className="thinking" aria-label="Thinking">
                        <span className="thinking__dot" />
                        <span className="thinking__dot" />
                        <span className="thinking__dot" />
                      </span>
                      Searching your materials…
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="chat__error">{error}</p>}
              <div ref={endRef} />
            </div>
          </main>

          <footer className="inputarea">
            <ChatInput onSend={handleSend} loading={loading} />
            <p className="inputarea__hint">
              Answers grounded in your course materials · Sources included with every reply
            </p>
          </footer>
        </section>
      </div>

      {/* Mobile toggle for left panel */}
      <button
        type="button"
        className="mobile-toggle"
        onClick={() => setLeftOpen((o) => !o)}
        aria-label={leftOpen ? "Show chat" : "Show documents"}
      >
        {leftOpen ? "💬" : "📄"}
      </button>
    </div>
  );
}
