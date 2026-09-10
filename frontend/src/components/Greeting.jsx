import { motion, useReducedMotion } from "motion/react";
import { GraduationCapIcon } from "@phosphor-icons/react";

export default function Greeting() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      className="greeting"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="greeting__mark" aria-hidden>
        <GraduationCapIcon size={34} weight="duotone" />
      </div>
      <h1 className="greeting__title">
        Ask anything from your course.
      </h1>
      <p className="greeting__lede">
        Every answer is drawn directly from your materials with source citations
        you can verify.
      </p>
    </motion.section>
  );
}