import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Rail from "./Rail";

test("marks the active view and fires callbacks", async () => {
  const onViewChange = vi.fn();
  const onNewChat = vi.fn();
  render(<Rail view="chat" onViewChange={onViewChange} onNewChat={onNewChat} canReset />);
  expect(screen.getByRole("button", { name: "Chat" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("button", { name: "Documents" })).not.toHaveAttribute("aria-current");
  await userEvent.click(screen.getByRole("button", { name: "Documents" }));
  expect(onViewChange).toHaveBeenCalledWith("documents");
  await userEvent.click(screen.getByRole("button", { name: "New chat" }));
  expect(onNewChat).toHaveBeenCalled();
});

test("new chat disabled without messages", () => {
  render(<Rail view="chat" onViewChange={() => {}} onNewChat={() => {}} canReset={false} />);
  expect(screen.getByRole("button", { name: "New chat" })).toBeDisabled();
});
