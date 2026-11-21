import { renderHook, waitFor } from "@testing-library/react";
import { listSessionFiles } from "../api";
import { useSessionFiles } from "./useSessionFiles";

vi.mock("../api", () => ({ listSessionFiles: vi.fn() }));

test("loads files", async () => {
  listSessionFiles.mockResolvedValue({ files: [{ filename: "a.pdf", size_bytes: 1, extension: ".pdf" }] });
  const { result } = renderHook(() => useSessionFiles("s1"));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.files).toHaveLength(1);
  expect(listSessionFiles).toHaveBeenCalledWith("s1");
});

test("backend down yields empty list, no throw", async () => {
  listSessionFiles.mockRejectedValue(new Error("Network Error"));
  const { result } = renderHook(() => useSessionFiles("s1"));
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.files).toEqual([]);
});

test("a slow response for an old session does not overwrite the new one", async () => {
  let resolveOld;
  listSessionFiles.mockImplementation((id) =>
    id === "old"
      ? new Promise((r) => (resolveOld = r))
      : Promise.resolve({ files: [{ filename: "new.md", size_bytes: 1, extension: ".md" }] }),
  );
  const { result, rerender } = renderHook(({ id }) => useSessionFiles(id), { initialProps: { id: "old" } });
  rerender({ id: "new" });
  await waitFor(() => expect(result.current.files[0]?.filename).toBe("new.md"));
  resolveOld({ files: [{ filename: "old.pdf", size_bytes: 1, extension: ".pdf" }] });
  await new Promise((r) => setTimeout(r, 20));
  expect(result.current.files.map((f) => f.filename)).toEqual(["new.md"]);
});
