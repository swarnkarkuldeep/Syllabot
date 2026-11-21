import { useLayoutEffect } from "react";
import { ArrowUpIcon } from "@phosphor-icons/react";
import ProviderPills from "./ProviderPills";

const MAX_HEIGHT = 144;

/** Composer: model pills above a single rounded field with an ink send disc. */
export default function ChatInput({
  value,
  onValueChange,
  onSend,
  loading,
  provider,
  onProviderChange,
  inputRef,
}) {
  // Grow the field with its content (also when a tile drafts a question).
  useLayoutEffect(() => {
    const el = inputRef?.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + "px";
    // A multi-line field reads better with a softer corner than a full pill.
    el.parentElement?.classList.toggle("is-tall", el.scrollHeight > 48);
  }, [value, inputRef]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    onValueChange("");
  };

  return (
    <div className="composer">
      <ProviderPills value={provider} onChange={onProviderChange} />

      <div className="composer__row">
        <textarea
          ref={inputRef}
          className="composer__field"
          rows={1}
          placeholder="Ask anything from your course…"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
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
          <ArrowUpIcon size={18} weight="bold" />
        </button>
      </div>
    </div>
  );
}
