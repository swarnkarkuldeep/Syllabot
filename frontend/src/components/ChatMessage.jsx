import { motion, useReducedMotion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { ThumbsUpIcon, ThumbsDownIcon } from "@phosphor-icons/react";
import BrandMark from "./BrandMark";
import SourcesPanel from "./SourcesPanel";
import { confidenceTint } from "../lib/sessionStats";

const ease = [0.22, 1, 0.36, 1];

const enter = {
  user: {
    initial: { opacity: 0, x: 18, scale: 0.96 },
    animate: { opacity: 1, x: 0, scale: 1 },
    transition: { type: "spring", stiffness: 420, damping: 32 },
  },
  ta: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease },
  },
};

function Avatar() {
  return (
    <div className="msg__avatar" aria-hidden>
      <BrandMark size={15} />
    </div>
  );
}

function FeedbackButton({ on, label, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      className={`fb${on ? " is-on" : ""}`}
      onClick={onClick}
      aria-pressed={on}
      title={label}
    >
      <motion.span
        className="fb__icon"
        key={on ? "on" : "off"}
        initial={on ? { scale: 0.4, rotate: -18 } : false}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 600, damping: 14 }}
      >
        <Icon size={14} weight={on ? "fill" : "regular"} />
      </motion.span>
      {label}
    </button>
  );
}

export default function ChatMessage({ message, onFeedback }) {
  const isUser = message.role === "user";
  const reduce = useReducedMotion();
  const m = enter[isUser ? "user" : "ta"];
  const motionProps = reduce ? {} : m;

  if (isUser) {
    return (
      <motion.div className="msg msg--user" {...motionProps} style={{ originX: 1, originY: 1 }}>
        <div className="msg__bubble">{message.content}</div>
        {message.createdAt && <span className="msg__time">{message.createdAt}</span>}
      </motion.div>
    );
  }

  const hasLatency = typeof message.latency_ms === "number";

  return (
    <motion.div className="msg msg--ta" {...motionProps}>
      <Avatar />
      <article className="msg__card">
        <div className="msg__body">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        <SourcesPanel sources={message.sources} />

        <footer className="msg__foot">
          <div className="msg__meta">
            {message.confidence && (
              <span className={`chip chip--${confidenceTint(message.confidence)}`}>
                {message.confidence}
              </span>
            )}
            {hasLatency && <span>{Math.round(message.latency_ms / 1000)}s</span>}
            {message.createdAt && <span>{message.createdAt}</span>}
          </div>

          {message.query_id != null && (
            <div className="msg__feedback">
              <FeedbackButton
                on={message.feedback === "up"}
                label="Helpful"
                icon={ThumbsUpIcon}
                onClick={() => onFeedback(message.query_id, "up", message)}
              />
              <FeedbackButton
                on={message.feedback === "down"}
                label="Not useful"
                icon={ThumbsDownIcon}
                onClick={() => onFeedback(message.query_id, "down", message)}
              />
            </div>
          )}
        </footer>
      </article>
    </motion.div>
  );
}

/** Placeholder shown while an answer is on its way. */
export function PendingMessage() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="msg msg--ta msg--pending"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      role="status"
    >
      <Avatar />
      <div className="msg__card msg__card--pending">
        <span className="dots" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <span className="shimmer">Reading your files…</span>
      </div>
    </motion.div>
  );
}
