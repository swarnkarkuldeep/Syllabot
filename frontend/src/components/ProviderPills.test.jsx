import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProviderPills from "./ProviderPills";

test("selected pill is checked; clicking changes", async () => {
  const onChange = vi.fn();
  render(<ProviderPills value="groq" onChange={onChange} />);
  expect(screen.getByRole("radio", { name: "Groq" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByRole("radio", { name: "Default" })).toHaveAttribute("aria-checked", "false");
  await userEvent.click(screen.getByRole("radio", { name: "Ollama" }));
  expect(onChange).toHaveBeenCalledWith("ollama");
});

test("arrow keys move the selection", async () => {
  const onChange = vi.fn();
  render(<ProviderPills value="" onChange={onChange} />);
  screen.getByRole("radio", { name: "Default" }).focus();
  await userEvent.keyboard("{ArrowRight}");
  expect(onChange).toHaveBeenCalledWith("gemini");
  await userEvent.keyboard("{ArrowLeft}");
  expect(onChange).toHaveBeenLastCalledWith("ollama");
});
