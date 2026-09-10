import { useEffect, useRef, useState } from "react";
import {
  PlusIcon,
  FileIcon,
  ChatsCircleIcon,
  BookOpenTextIcon,
} from "@phosphor-icons/react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Greeting from "./components/Greeting";
import FileUpload from "./components/FileUpload";
import { deleteSession, sendMessage, submitFeedback } from "./api";
import "./App.css";

const SESSION_KEY = "syllabot_session_id";
const PROVIDER_KEY = "syllabot_provider";

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

function getStoredProvider() {
  return localStorage.getItem(PROVIDER_KEY) || "";
}

export default function App() {
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(getStoredProvider);
  const [docsOpen, setDocsOpen] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const handleProviderChange = (val) => {
    setProvider(val);
    if (val) {
      localStorage.setItem(PROVIDER_KEY, val);
    } else {
      localStorage.removeItem(PROVIDER_KEY);
    }
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
        `Unable to reach the assistant - ${detail}. Make sure the backend is running on :8000.`,
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
      {/* Ambient background blobs */}
      <div className="app__bg" aria-hidden>
        <div className="app__blob app__blob--1" />
        <div className="app__blob app__blob--2" />
        <div className="app__blob app__blob--3" />
      </div>

      {/* ── Floating Navbar ─────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar__brand">
          <span className="navbar__mark" aria-hidden>
            <BookOpenTextIcon size={18} weight="fill" />
          </span>
          <div>
            <span className="navbar__name">Syllabot</span>
            <span className="navbar__suffix">AI Study Companion</span>
          </div>
        </div>

        <div className="navbar__actions">
          {hasMessages && (
            <button
              type="button"
              className="btn"
              onClick={handleNewChat}
              title="Start a fresh conversation"
            >
              <PlusIcon size={14} weight="bold" />
              New chat
            </button>
          )}
        </div>
      </nav>

      {/* ── Workspace ──────────────────────────────────────────────────── */}
      <div className="workspace">
        {/* Documents panel */}
        <aside className={`docs${docsOpen ? " is-open" : ""}`}>
          <div className="docs__head">
            <span className="docs__title">
              <FileIcon size={15} weight="fill" />
              Documents
            </span>
          </div>
          <div className="docs__body">
            <FileUpload sessionId={sessionId} />
          </div>
          <div className="docs__status">
            <span className="status-dot status-dot--ok" aria-hidden />
            <span>Session: {sessionId.slice(0, 12)}...</span>
          </div>
        </aside>

        {/* Chat pane */}
        <section className="chatpane">
          <main className="chat">
            <div className="thread">
              {!hasMessages && <Greeting />}

              {messages.map((msg, i) => (
                <ChatMessage key={i} message={msg} onFeedback={handleFeedback} />
              ))}

              {loading && (
                <div className="msg msg--ta">
                  <div className="msg__avatar" aria-hidden>
                    <span className="thinking" aria-label="Thinking">
                      <span className="thinking__dot" />
                      <span className="thinking__dot" />
                      <span className="thinking__dot" />
                    </span>
                  </div>
                  <div className="msg__card">
                    <div className="msg__card--pending">
                      Searching your materials...
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="chat__error">{error}</p>}
              <div ref={endRef} />
            </div>
          </main>

          <footer className="composer-wrap">
            <ChatInput
              onSend={handleSend}
              loading={loading}
              provider={provider}
              onProviderChange={handleProviderChange}
            />
            <p className="composer__hint">
              Answers grounded in your course materials
            </p>
          </footer>
        </section>
      </div>

      {/* FAB - mobile documents toggle */}
      <button
        type="button"
        className="fab"
        onClick={() => setDocsOpen((o) => !o)}
        aria-label={docsOpen ? "Show chat" : "Show documents"}
      >
        {docsOpen ? <ChatsCircleIcon size={22} weight="fill" /> : <FileIcon size={22} weight="fill" />}
      </button>
    </div>
  );
}
