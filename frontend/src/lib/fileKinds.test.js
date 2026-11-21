import { fileKind, formatSize, extOf } from "./fileKinds";

test.each([
  [".pdf", "PDF", "rose"], ["PDF", "PDF", "rose"], [".docx", "Word", "peach"],
  [".md", "Notes", "lavender"], [".txt", "Notes", "lavender"], [".csv", "Data", "mint"],
  [".json", "Data", "mint"], [".html", "Web page", "sky"], [".xyz", "File", "sky"], [undefined, "File", "sky"],
])("fileKind(%s)", (ext, label, tint) => expect(fileKind(ext)).toEqual({ label, tint }));

test("formatSize", () => {
  expect(formatSize(512)).toBe("512 B");
  expect(formatSize(2048)).toBe("2.0 KB");
  expect(formatSize(3 * 1024 * 1024)).toBe("3.0 MB");
});

test("extOf", () => {
  expect(extOf("week3.Notes.MD")).toBe(".md");
  expect(extOf("README")).toBe("");
  expect(extOf(".env")).toBe("");
  expect(extOf(undefined)).toBe("");
});
