const EXAMPLES = [
  "Explain the difference between TCP and UDP",
  "How does a hash table handle collisions?",
  "Walk me through Big O notation for common sorts",
];

export default function Greeting({ onPick }) {
  return (
    <section className="greeting">
      <p className="greeting__eyebrow">Study companion</p>
      <h1 className="greeting__title">
        Ask anything from your course.
      </h1>
      <p className="greeting__lede">
        Every answer is drawn directly from your materials
        with source citations you can verify.
      </p>
      <div className="greeting__chips">
        {EXAMPLES.map((q) => (
          <button
            type="button"
            key={q}
            className="greeting__chip"
            onClick={() => onPick(q)}
          >
            <span className="greeting__chip-label">
              <span className="greeting__chip-arrow" aria-hidden>→</span>
              {q}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
