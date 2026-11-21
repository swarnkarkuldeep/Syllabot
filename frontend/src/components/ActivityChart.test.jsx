import { render, screen } from "@testing-library/react";
import ActivityChart from "./ActivityChart";

test("empty state", () => {
  render(<ActivityChart messages={[]} />);
  expect(screen.getByText("0 asked")).toBeInTheDocument();
  expect(screen.getByText("Your questions and reply times show up here.")).toBeInTheDocument();
});

test("one bar per timed answer, tinted by confidence", () => {
  const { container } = render(
    <ActivityChart
      messages={[{ role: "user" }, { role: "assistant", latency_ms: 3000, confidence: "medium" }]}
    />,
  );
  expect(screen.getByText("1 asked")).toBeInTheDocument();
  expect(screen.getByText("3s average reply")).toBeInTheDocument();
  expect(container.querySelectorAll(".bar")).toHaveLength(1);
  expect(container.querySelector(".bar--peach")).toBeInTheDocument();
});
