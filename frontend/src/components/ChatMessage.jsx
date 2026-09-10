import { motion, useReducedMotion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { GraduationCapIcon, ThumbsUpIcon, ThumbsDownIcon, BrainIcon } from "@phosphor-icons/react";
import SourcesPanel from "./SourcesPanel";

// motion entrance for each message
const rise = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1 },
};

export default function ChatMessage({ message, onFeedback }) {
  const isUser = message.role === "user";
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={`msg msg--${isUser ? "user" : "ta"}`}
      initial={reduce ? false : rise.initial}
      animate={rise.animate}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      {isUser ? (
        <div className="msg__bubble">{message.content}</div>
      ) : (
        <>
          <div className="msg__avatar" aria-hidden>
            <GraduationCapIcon size={17} weight="fill" />
          </div>
          <article className="msg__card">
            <div className="msg__body">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>

            {(message.confidence ||
              typeof message.latency_ms === "number") && (
              <div className="msg__meta">
                {message.confidence && (
                  <span className={`msg__conf msg__conf--${message.confidence}`}>
                    {message.confidence}
                  </span>
                )}
                {typeof message.latency_ms === "number" && (
                  <span className="msg__latency">
                    <BrainIcon size={11} weight="fill" aria-hidden />{" "}
                    {Math.round(message.latency_ms / 1000)}s
                  </span>
                )}
              </div>
            )}

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
                  <ThumbsUpIcon size={14} weight={message.feedback === "up" ? "fill" : "regular"} />
                  Helpful
                </button>
                <button
                  type="button"
                  className={`msg__fb${message.feedback === "down" ? " is-on" : ""}`}
                  onClick={() => onFeedback(message.query_id, "down", message)}
                  aria-label="Not helpful"
                  title="Not helpful"
                >
                  <ThumbsDownIcon size={14} weight={message.feedback === "down" ? "fill" : "regular"} />
                  Not useful
                </button>
              </div>
            )}
          </article>
        </>
      )}
    </motion.div>
  );
}