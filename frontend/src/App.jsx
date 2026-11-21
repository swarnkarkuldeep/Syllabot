import { useEffect, useRef, useState } from "react";
import ChatMessage from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Greeting from "./components/Greeting";
import Rail from "./components/Rail";
import SessionPanel from "./components/SessionPanel";
import { useSessionFiles } from "./lib/useSessionFiles";
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
  const [view, setView] = useState("chat");
  const endRef = useRef(null);
  const panelHeadingRef = useRef(null);
  const uploadInputRef = useRef(null);
  const { files, refresh: refreshFiles } = useSessionFiles(sessionId);

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

  const handleViewChange = (next) => {
    setView(next);
    // On wide screens the panel is always visible; move focus to it instead.
    if (next === "documents" && window.matchMedia("(min-width: 1100px)").matches) {
      panelHeadingRef.current?.focus();
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
    <div className={`shell shell--${view}`}>
      <Rail
        view={view}
        onViewChange={handleViewChange}
        onNewChat={handleNewChat}
        canReset={hasMessages}
      />

      <section className="center">
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
                  <div className="msg__card--pending">Reading your files…</div>
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
        </footer>
      </section>

      <SessionPanel
        sessionId={sessionId}
        messages={messages}
        files={files}
        onRefresh={refreshFiles}
        uploadInputRef={uploadInputRef}
        headingRef={panelHeadingRef}
      />
    </div>
  );
}
