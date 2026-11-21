// Derives the numbers shown in the session panel from real chat state.

const TINTS = { high: "mint", medium: "peach", low: "rose" };
const MAX_BARS = 7;

export function confidenceTint(confidence) {
  return TINTS[confidence] || "sand";
}

const round1 = (n) => Math.round(n * 10) / 10;

export function sessionStats(messages) {
  const asked = messages.filter((m) => m.role === "user").length;

  // q = the number of the question (user turn) each answer replies to.
  let q = 0;
  const timed = [];
  for (const m of messages) {
    if (m.role === "user") q += 1;
    else if (m.role === "assistant" && Number.isFinite(m.latency_ms)) {
      timed.push({ q, seconds: round1(m.latency_ms / 1000), tint: confidenceTint(m.confidence) });
    }
  }
  timed.splice(0, Math.max(0, timed.length - MAX_BARS));

  if (timed.length === 0) return { asked, avgSeconds: null, bars: [] };

  const max = Math.max(...timed.map((b) => b.seconds)) || 1;
  const bars = timed.map((b) => ({ ...b, heightPct: Math.max(8, Math.round((b.seconds / max) * 100)) }));
  const avgSeconds = round1(timed.reduce((sum, b) => sum + b.seconds, 0) / timed.length);

  return { asked, avgSeconds, bars };
}
