import { motion, useReducedMotion } from "motion/react";

const LINES = ["Study straight from", "your notes"];
const ease = [0.22, 1, 0.36, 1];

/** Opening headline. Each line rises out of its own mask, once, on load. */
export default function Greeting() {
  const reduce = useReducedMotion();

  return (
    <header className="greeting">
      <h1 className="greeting__title" aria-label={LINES.join(" ")}>
        {LINES.map((line, i) => (
          <span className="greeting__mask" key={line} aria-hidden>
            <motion.span
              className="greeting__line"
              initial={reduce ? false : { y: "105%" }}
              animate={{ y: "0%" }}
              transition={{ duration: 0.8, ease, delay: 0.06 + i * 0.09 }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>
      <motion.p
        className="greeting__lede"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease, delay: 0.3 }}
      >
        Answers come only from the files you upload, with the passage they came from.
      </motion.p>
    </header>
  );
}
