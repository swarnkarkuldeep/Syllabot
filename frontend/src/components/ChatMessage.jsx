import ReactMarkdown from "react-markdown";
import SourcesPanel from "./SourcesPanel";

export default function ChatMessage({ message, onFeedback }) {
  const isUser = message.role === "user";

  return (
    <div className={`msg msg--${isUser ? "user" : "ta"}`}>
      {isUser ? (
        <div className="msg__bubble msg__bubble--user">{message.content}</div>
      ) : (
        <div className="msg__card-outer">
          <article className="msg__card">
            <div className="msg__body">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            <div className="msg__meta">
              {message.confidence && message.confidence !== "high" && (
                <span className={`msg__conf msg__conf--${message.confidence}`}>
                  {message.confidence}
                </span>
              )}
              {typeof message.latency_ms === "number" && (
                <span className="msg__latency">
                  {Math.round(message.latency_ms / 1000)}s
                </span>
              )}
            </div>

            {message.createdAt && (
              <div className="msg__created">{message.createdAt}</div>
            )}

            <SourcesPanel sources={message.sources} />

            {message.query_id != null && (
              <div className="msg__feedback">
                <button
                  type="button"
                  className={`msg__fb${message.feedback === "up" ? " is-on" : ""}`}
                  onClick={() => onFeedback(message.query_id, "up", message)}
                  aria-label="Helpful"
                  title="Helpful"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={`msg__fb${message.feedback === "down" ? " is-on" : ""}`}
                  onClick={() => onFeedback(message.query_id, "down", message)}
                  aria-label="Not helpful"
                  title="Not helpful"
                >
                  ↓
                </button>
              </div>
            )}
          </article>
        </div>
      )}
    </div>
  );
}
