import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChatCircleTextIcon, PlusIcon } from "@phosphor-icons/react";
import { fileKind, formatSize } from "../lib/fileKinds";
import { KindIcon } from "./FileUpload";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.28 } },
};

const item = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
  exit: { opacity: 0, scale: 0.94, transition: { duration: 0.18 } },
};

const press = { whileHover: { y: -4 }, whileTap: { scale: 0.975, y: 0 } };

/** The session's files as pastel tiles. Clicking one drafts a question about it. */
export default function MaterialsGrid({ files, onAsk, onAddFile }) {
  const reduce = useReducedMotion();
  const anim = reduce ? {} : { variants: item, ...press };

  return (
    <section className="materials" aria-labelledby="materials-title">
      <div className="materials__head">
        <h2 id="materials-title" className="materials__title">Your materials</h2>
        {files.length > 0 && (
          <span className="materials__count">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
        )}
      </div>

      <motion.div
        className="materials__grid"
        variants={reduce ? undefined : container}
        initial={reduce ? false : "hidden"}
        animate="show"
      >
        <AnimatePresence mode="popLayout">
          {files.length === 0 ? (
            <motion.button
              key="add"
              type="button"
              className="tile tile--sky tile--add"
              onClick={onAddFile}
              layout={!reduce}
              exit={reduce ? undefined : "exit"}
              {...anim}
            >
              <span className="tile__disc tile__disc--ink" aria-hidden>
                <PlusIcon size={18} weight="bold" />
              </span>
              <span className="tile__title">Add your first file</span>
              <span className="tile__body">
                Lecture notes, slides or readings. PDF, Word, text, markdown, CSV, JSON or HTML.
              </span>
            </motion.button>
          ) : (
            files.map((f) => {
              const kind = fileKind(f.extension);
              return (
                <motion.button
                  key={f.filename}
                  type="button"
                  className={`tile tile--${kind.tint}`}
                  aria-label={`Ask about ${f.filename}`}
                  onClick={() => onAsk(f.filename)}
                  layout={!reduce}
                  exit={reduce ? undefined : "exit"}
                  {...anim}
                >
                  <span className="tile__top">
                    <span className="tile__kind">
                      <span className="tile__disc" aria-hidden>
                        <KindIcon ext={f.extension} size={15} />
                      </span>
                      {kind.label}
                    </span>
                    <span className="tile__size">{formatSize(f.size_bytes || 0)}</span>
                  </span>
                  <span className="tile__title" title={f.filename}>
                    {f.filename}
                  </span>
                  <span className="tile__ask" aria-hidden>
                    <ChatCircleTextIcon size={17} weight="fill" />
                  </span>
                </motion.button>
              );
            })
          )}
        </AnimatePresence>
      </motion.div>
    </section>
  );
}
