import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatMessage from "./ChatMessage";

test("assistant message shows tinted confidence, latency and feedback", async () => {
  const onFeedback = vi.fn();
  const msg = {
    role: "assistant",
    content: "**Hi**",
    confidence: "low",
    latency_ms: 2400,
    query_id: 7,
    createdAt: "10:00",
  };
  render(<ChatMessage message={msg} onFeedback={onFeedback} />);
  expect(screen.getByText("low")).toHaveClass("chip--rose");
  expect(screen.getByText("2s")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Helpful" }));
  expect(onFeedback).toHaveBeenCalledWith(7, "up", msg);
});

test("sources show a kind chip and a match percentage", async () => {
  const msg = {
    role: "assistant",
    content: "ok",
    sources: [{ file: "week3.pdf", score: 0.823, excerpt: "Trees are…" }],
  };
  const { container } = render(<ChatMessage message={msg} onFeedback={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: /Sources/ }));
  expect(screen.getByText("82% match")).toBeInTheDocument();
  expect(container.querySelector(".source__chip.chip--rose")).toBeInTheDocument();
});
