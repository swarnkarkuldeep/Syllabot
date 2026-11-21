// File-type vocabulary shared by the materials grid, the document list and
// source citations. The tint encodes the kind of file, so color carries meaning.

const KINDS = {
  pdf: { label: "PDF", tint: "rose" },
  docx: { label: "Word", tint: "peach" },
  md: { label: "Notes", tint: "lavender" },
  txt: { label: "Notes", tint: "lavender" },
  csv: { label: "Data", tint: "mint" },
  json: { label: "Data", tint: "mint" },
  html: { label: "Web page", tint: "sky" },
};

const FALLBACK = { label: "File", tint: "sky" };

/** @param {string|undefined} ext - ".pdf", "pdf" or "PDF" */
export function fileKind(ext) {
  const key = String(ext || "").replace(/^\./, "").toLowerCase();
  return { ...(KINDS[key] || FALLBACK) };
}

/** Extension of a filename including the dot, e.g. "notes.MD" -> ".md". */
export function extOf(filename) {
  const name = String(filename || "");
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot).toLowerCase() : "";
}

export function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
