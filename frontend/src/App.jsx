import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import ChatMessage, { PendingMessage } from "./components/ChatMessage";
import ChatInput from "./components/ChatInput";
import Greeting from "./components/Greeting";
import MaterialsGrid from "./components/MaterialsGrid";
import Rail from "./components/Rail";
import SessionPanel from "./components/SessionPanel";
import { useSessionFiles } from "./lib/useSessionFiles";
import { deleteSession, sendMessage, submitFeedback } from "./api";

const SESSION_KEY = "syllabot_session_id";
const PROVIDER_KEY = "syllabot_provider";
const WIDE = "(min-width: 1100px)";

function makeSessionId() {
  return `sess-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = makeSessionId();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function newSessionId() {
  const id = makeSessionId();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

function timeNow() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStoredProvider() {
  return localStorage.getItem(PROVIDER_KEY) || "";
}

const swap = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -14, transition: { duration: 0.22, ease: [0.4, 0, 1, 1] } },
};

export default function App() {
  const reduce = useReducedMotion();
  const [sessionId, setSessionId] = useState(getSessionId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(getStoredProvider);
  const [view, setView] = useState("chat");
  const [draft, setDraft] = useState("");
  const endRef = useRef(null);
  const panelHeadingRef = useRef(null);
  const uploadInputRef = useRef(null);
  const composerRef = useRef(null);
  const { files, refresh: refreshFiles } = useSessionFiles(sessionId);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "end" });
  }, [messages, loading, reduce]);

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
    if (next === "documents" && window.matchMedia(WIDE).matches) {
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

  const handleAsk = (filename) => {
    setDraft(`Summarize the key ideas in ${filename}`);
    setView("chat");
    requestAnimationFrame(() => {
      const el = composerRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    });
  };

  const handleAddFile = () => {
    if (!window.matchMedia(WIDE).matches) setView("documents");
    uploadInputRef.current?.click();
  };

  const handleSend = async (text) => {
    setMessages((m) => [...m, { role: "user", content: text, createdAt: timeNow() }]);
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
      const detail = err?.response?.data?.detail || err?.message || "Something went wrong.";
      setError(`Couldn't reach Syllabot: ${detail}. Check that the backend is running on port 8000.`);
    } finally {
      setLoading(false);
    }
  };

  const handleFeedback = async (queryId, rating, message) => {
    const turningOff = message.feedback === rating;
    setMessages((m) =>
      m.map((msg) =>
        msg.query_id === queryId ? { ...msg, feedback: turningOff ? null : rating } : msg,
      ),
    );
    try {
      await submitFeedback(queryId, rating, turningOff ? null : "from chat UI");
    } catch {
      setMessages((m) =>
        m.map((msg) => (msg.query_id === queryId ? { ...msg, feedback: null } : msg)),
      );
    }
  };

  const hasMessages = messages.length > 0;
  const motionProps = reduce ? {} : swap;

  return (
    <div className={`shell shell--${view}`}>
      <Rail
        view={view}
        onViewChange={handleViewChange}
        onNewChat={handleNewChat}
        canReset={hasMessages}
      />

      <section className="center" aria-label="Chat">
        <div className="center__scroll">
          <div className="center__inner">
            <AnimatePresence mode="wait" initial={false}>
              {!hasMessages ? (
                <motion.div key="intro" className="intro" {...motionProps}>
                  <Greeting />
                  <MaterialsGrid files={files} onAsk={handleAsk} onAddFile={handleAddFile} />
                </motion.div>
              ) : (
                <motion.div key="thread" className="thread" {...motionProps}>
                  {messages.map((msg, i) => (
                    <ChatMessage key={i} message={msg} onFeedback={handleFeedback} />
                  ))}

                  {loading && <PendingMessage />}

                  {error && (
                    <p className="chat-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div ref={endRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <footer className="dock">
          <div className="dock__inner">
            <ChatInput
              value={draft}
              onValueChange={setDraft}
              onSend={handleSend}
              loading={loading}
              provider={provider}
              onProviderChange={handleProviderChange}
              inputRef={composerRef}
            />
          </div>
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
