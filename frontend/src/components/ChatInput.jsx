import { useState } from "react";

export default function ChatInput({ onSend, loading }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setValue("");
  };

  return (
    <div className="inputbar">
      <textarea
        className="inputbar__field"
        rows={1}
        placeholder="Ask anything from your course…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
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
        className="inputbar__send"
        onClick={submit}
        disabled={loading || !value.trim()}
        aria-label="Send message"
      >
        {loading ? "···" : "Ask →"}
      </button>
    </div>
  );
}
