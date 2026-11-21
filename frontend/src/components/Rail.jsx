import { motion, useReducedMotion } from "motion/react";
import { PlusIcon, ChatsCircleIcon, FilesIcon } from "@phosphor-icons/react";
import BrandMark from "./BrandMark";

const VIEWS = [
  { key: "chat", label: "Chat", icon: ChatsCircleIcon },
  { key: "documents", label: "Documents", icon: FilesIcon },
];

const spring = { type: "spring", stiffness: 520, damping: 38, mass: 0.8 };

/** Slim icon rail. The ink disc slides to whichever view is active. */
export default function Rail({ view, onViewChange, onNewChat, canReset }) {
  const reduce = useReducedMotion();

  return (
    <aside className="rail">
      <span className="rail__brand">
        <BrandMark size={26} />
        <span className="sr-only">Syllabot</span>
      </span>

      <nav className="rail__nav" aria-label="Main">
        {VIEWS.map(({ key, label, icon: Icon }) => {
          const active = view === key;
          return (
            <button
              key={key}
              type="button"
              className="rail__btn"
              aria-label={label}
              title={label}
              aria-current={active ? "page" : undefined}
              onClick={() => onViewChange(key)}
            >
              {active && (
                <motion.span
                  className="rail__disc"
                  layoutId="rail-disc"
                  transition={reduce ? { duration: 0 } : spring}
                />
              )}
              <span className="rail__icon">
                <Icon size={20} weight={active ? "fill" : "regular"} />
              </span>
            </button>
          );
        })}
      </nav>

      <span className="rail__spacer" />

      <button
        type="button"
        className="rail__btn"
        aria-label="New chat"
        title="New chat"
        onClick={onNewChat}
        disabled={!canReset}
      >
        <span className="rail__icon">
          <PlusIcon size={20} weight="bold" />
        </span>
      </button>
    </aside>
  );
}
