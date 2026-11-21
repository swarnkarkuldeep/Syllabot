import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MaterialsGrid from "./MaterialsGrid";

const files = [{ filename: "week3.pdf", size_bytes: 2048, extension: ".pdf" }];

test("tile per file, tinted by kind, click asks", async () => {
  const onAsk = vi.fn();
  render(<MaterialsGrid files={files} onAsk={onAsk} onAddFile={() => {}} />);
  const tile = screen.getByRole("button", { name: "Ask about week3.pdf" });
  expect(tile).toHaveClass("tile--rose");
  expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  await userEvent.click(tile);
  expect(onAsk).toHaveBeenCalledWith("week3.pdf");
});

test("empty shows add tile", async () => {
  const onAddFile = vi.fn();
  render(<MaterialsGrid files={[]} onAsk={() => {}} onAddFile={onAddFile} />);
  await userEvent.click(screen.getByRole("button", { name: /Add your first file/ }));
  expect(onAddFile).toHaveBeenCalled();
});

test("12 files with a long unbroken name all render", () => {
  const many = Array.from({ length: 12 }, (_, i) => ({
    filename: `Lecture_${i}_Final_FINAL_v2_reviewed_by_TA_xxxxxxxxxxxxxxxx.pdf`,
    size_bytes: 1,
    extension: ".pdf",
  }));
  render(<MaterialsGrid files={many} onAsk={() => {}} onAddFile={() => {}} />);
  expect(screen.getAllByRole("button", { name: /^Ask about/ })).toHaveLength(12);
});
