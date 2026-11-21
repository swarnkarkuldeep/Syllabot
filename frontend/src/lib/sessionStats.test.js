import { sessionStats, confidenceTint } from "./sessionStats";

test("empty", () => expect(sessionStats([])).toEqual({ asked: 0, avgSeconds: null, bars: [] }));

test("skips non-numeric latency and maps error confidence to sand", () => {
  const s = sessionStats([
    { role: "user" }, { role: "assistant", latency_ms: 2000, confidence: "high" },
    { role: "user" }, { role: "assistant", confidence: "error" },
    { role: "user" }, { role: "assistant", latency_ms: 4000, confidence: "error" },
  ]);
  expect(s.asked).toBe(3);
  expect(s.avgSeconds).toBe(3);
  expect(s.bars).toEqual([
    { seconds: 2, tint: "mint", heightPct: 50 },
    { seconds: 4, tint: "sand", heightPct: 100 },
  ]);
});

test("keeps only last 7 bars and floors height at 8", () => {
  const msgs = [{ role: "assistant", latency_ms: 100 }, ...Array.from({ length: 8 }, () => ({ role: "assistant", latency_ms: 10000 }))];
  const s = sessionStats(msgs);
  expect(s.bars).toHaveLength(7);
  expect(s.bars.every((b) => b.heightPct === 100)).toBe(true);
  expect(sessionStats([{ role: "assistant", latency_ms: 100 }, { role: "assistant", latency_ms: 100000 }]).bars[0].heightPct).toBe(8);
});

test("confidenceTint", () => {
  expect(confidenceTint("high")).toBe("mint");
  expect(confidenceTint("medium")).toBe("peach");
  expect(confidenceTint("low")).toBe("rose");
  expect(confidenceTint(undefined)).toBe("sand");
});
