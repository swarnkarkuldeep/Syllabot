// Derives the numbers shown in the session panel from real chat state.

const TINTS = { high: "mint", medium: "peach", low: "rose" };
const MAX_BARS = 7;

export function confidenceTint(confidence) {
  return TINTS[confidence] || "sand";
}

const round1 = (n) => Math.round(n * 10) / 10;

export function sessionStats(messages) {
  const asked = messages.filter((m) => m.role === "user").length;

  const timed = messages
    .filter((m) => m.role === "assistant" && Number.isFinite(m.latency_ms))
    .slice(-MAX_BARS)
    .map((m) => ({ seconds: round1(m.latency_ms / 1000), tint: confidenceTint(m.confidence) }));

  if (timed.length === 0) return { asked, avgSeconds: null, bars: [] };

  const max = Math.max(...timed.map((b) => b.seconds)) || 1;
  const bars = timed.map((b) => ({ ...b, heightPct: Math.max(8, Math.round((b.seconds / max) * 100)) }));
  const avgSeconds = round1(timed.reduce((sum, b) => sum + b.seconds, 0) / timed.length);

  return { asked, avgSeconds, bars };
}
