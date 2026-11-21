import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { extOf, fileKind } from "../lib/fileKinds";
import { KindIcon } from "./FileUpload";

function matchLabel(score) {
  if (typeof score !== "number") return String(score ?? "");
  return score <= 1 ? `${Math.round(score * 100)}% match` : score.toFixed(2);
}

/** Collapsible list of the passages an answer was drawn from. */
export default function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  if (!sources || sources.length === 0) return null;

  return (
    <div className={`sources${open ? " is-open" : ""}`}>
      <button
        type="button"
        className="sources__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className="sources__stack" aria-hidden>
          {sources.slice(0, 3).map((s, i) => (
            <span key={i} className={`sources__dot chip--${fileKind(extOf(s.file)).tint}`} />
          ))}
        </span>
        Sources
        <span className="sources__count">{sources.length}</span>
        <motion.span
          className="sources__chevron"
          aria-hidden
          animate={{ rotate: open ? 180 : 0 }}
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 28 }}
        >
          <CaretDownIcon size={12} weight="bold" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.ol
            className="sources__list"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          >
            {sources.map((src, i) => {
              const ext = extOf(src.file);
              return (
                <li className="source" key={i}>
                  <span className={`source__chip chip--${fileKind(ext).tint}`} aria-hidden>
                    <KindIcon ext={ext} size={13} />
                  </span>
                  <div className="source__main">
                    <div className="source__head">
                      <span className="source__file">{src.file}</span>
                      <span className="source__score">{matchLabel(src.score)}</span>
                    </div>
                    {src.excerpt && <p className="source__excerpt">{src.excerpt}</p>}
                  </div>
                </li>
              );
            })}
          </motion.ol>
        )}
      </AnimatePresence>
    </div>
  );
}
