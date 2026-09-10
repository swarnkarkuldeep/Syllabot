import { useEffect, useRef, useState } from "react";
import {
  CaretDownIcon,
  CheckIcon,
  SparkleIcon,
  LightningIcon,
  CpuIcon,
  PaperPlaneRightIcon,
  CubeIcon,
} from "@phosphor-icons/react";

const PROVIDERS = [
  { key: "", label: "Default", icon: CubeIcon },
  { key: "gemini", label: "Gemini", icon: SparkleIcon },
  { key: "groq", label: "Groq", icon: LightningIcon },
  { key: "ollama", label: "Ollama", icon: CpuIcon },
];

function currentProvider(key) {
  return PROVIDERS.find((p) => p.key === key) || PROVIDERS[0];
}

/**
 * Composer — glass input bar with the LLM provider selector beside the field.
 * The provider pill stays next to the chat field (per the UX brief).
 */
export default function ChatInput({ onSend, loading, provider, onProviderChange }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  // Close the provider menu on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue("");
  };

  const active = currentProvider(provider);

  return (
    <div className="composer">
      {/* Provider selector — kept right next to the chat field */}
      <div
        className={`composer__provider-wrap${open ? " is-open" : ""}`}
        ref={wrapRef}
      >
        <button
          type="button"
          className="composer__provider"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={`LLM provider: ${active.label}`}
        >
          <active.icon size={15} weight="fill" />
          <span className="composer__provider-label">{active.label}</span>
          <span className="composer__provider-chevron">
            <CaretDownIcon size={11} weight="bold" />
          </span>
        </button>

        {open && (
          <div className="composer__menu" role="listbox" ref={menuRef}>
            <span className="composer__menu-label">Model</span>
            {PROVIDERS.map((p) => (
              <button
                type="button"
                key={p.key || "default"}
                role="option"
                aria-selected={p.key === provider}
                className={`composer__option${
                  p.key === provider ? " is-active" : ""
                }`}
                onClick={() => {
                  onProviderChange(p.key);
                  setOpen(false);
                }}
              >
                <p.icon size={16} weight="duotone" />
                {p.label}
                {p.key === provider && (
                  <span className="composer__option-check">
                    <CheckIcon size={14} weight="bold" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <textarea
        className="composer__field"
        rows={1}
        placeholder="Ask anything from your course…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 144) + "px";
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        aria-label="Message"
      />

      <button
        type="button"
        className="composer__send"
        onClick={submit}
        disabled={loading || !value.trim()}
        aria-label="Send message"
      >
        <PaperPlaneRightIcon size={20} weight="fill" />
      </button>
    </div>
  );
}