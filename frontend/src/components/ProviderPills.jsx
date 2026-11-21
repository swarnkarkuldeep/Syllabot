import { useRef } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CubeIcon, CloudIcon, LightningIcon, CpuIcon } from "@phosphor-icons/react";

export const PROVIDERS = [
  { key: "", label: "Default", icon: CubeIcon },
  { key: "gemini", label: "Gemini", icon: CloudIcon },
  { key: "groq", label: "Groq", icon: LightningIcon },
  { key: "ollama", label: "Ollama", icon: CpuIcon },
];

const spring = { type: "spring", stiffness: 500, damping: 40, mass: 0.9 };

/** Model picker as a row of pills; the ink fill slides to the chosen one. */
export default function ProviderPills({ value, onChange }) {
  const reduce = useReducedMotion();
  const refs = useRef([]);
  const current = Math.max(0, PROVIDERS.findIndex((p) => p.key === value));

  const onKeyDown = (e) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = (current + step + PROVIDERS.length) % PROVIDERS.length;
    onChange(PROVIDERS[next].key);
    refs.current[next]?.focus();
  };

  return (
    <div className="pills" role="radiogroup" aria-label="Model" onKeyDown={onKeyDown}>
      {PROVIDERS.map((p, i) => {
        const on = i === current;
        const Icon = p.icon;
        return (
          <button
            key={p.key || "default"}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={`pill${on ? " is-on" : ""}`}
            onClick={() => onChange(p.key)}
          >
            {on && (
              <motion.span
                className="pill__fill"
                layoutId="provider-fill"
                transition={reduce ? { duration: 0 } : spring}
              />
            )}
            <span className="pill__icon" aria-hidden>
              <Icon size={15} weight={on ? "fill" : "regular"} />
            </span>
            <span className="pill__label">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
