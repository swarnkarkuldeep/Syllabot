import { useState } from "react";

export default function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="sources">
      <button
        type="button"
        className="sources__toggle"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Sources</span>
        <span className="sources__count">{sources.length}</span>
        <span className={`sources__chevron${open ? " is-open" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <ol className="sources__list">
          {sources.map((src, i) => (
            <li className="sources__item" key={i}>
              <span className="sources__file">{src.file}</span>
              <span className="sources__score">
                {typeof src.score === "number" ? src.score.toFixed(3) : src.score}
              </span>
              {src.excerpt && <p className="sources__excerpt">{src.excerpt}</p>}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
