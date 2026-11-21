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
