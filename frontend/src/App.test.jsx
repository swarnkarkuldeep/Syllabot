import { render } from "@testing-library/react";
import App from "./App";

vi.mock("./api", () => ({
  listSessionFiles: vi.fn().mockResolvedValue({ files: [] }),
  deleteSession: vi.fn(),
  sendMessage: vi.fn(),
  submitFeedback: vi.fn(),
}));

beforeAll(() => {
  window.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  Element.prototype.scrollIntoView ??= () => {};
});

test("headline lines start below their mask on first load (reveal plays)", () => {
  const { container } = render(<App />);
  const line = container.querySelector(".greeting__line");
  expect(line.style.transform).toContain("105%");
});
