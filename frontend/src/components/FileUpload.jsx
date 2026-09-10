import { useCallback, useEffect, useRef, useState } from "react";
import {
  listSessionFiles,
  deleteSession,
  uploadFile,
  deleteSessionFile,
  readSessionFile,
} from "../api";

const ACCEPT = ".pdf,.txt,.md,.docx,.csv,.json,.html";

const FILE_ICONS = {
  ".pdf": "📄",
  ".txt": "📝",
  ".md": "📝",
  ".docx": "📘",
  ".csv": "📊",
  ".json": "📋",
  ".html": "🌐",
};

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Document panel — upload, list, view, and manage course files.
 * Shown in the left panel of the split layout.
 */
export default function FileUpload({ sessionId, onFilesChanged }) {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(null); // { filename, content, extension }
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState(null);
  const inputRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await listSessionFiles(sessionId);
      setFiles(res.files || []);
    } catch {
      setFiles([]);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleUpload = async (file) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await uploadFile(sessionId, file);
      await refresh();
      onFilesChanged?.();
    } catch (err) {
      setError(
        err?.response?.data?.detail || err?.message || "Upload failed."
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileInput = (e) => {
    handleUpload(e.target.files?.[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleClear = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteSession(sessionId);
      setFiles([]);
      setViewing(null);
      onFilesChanged?.();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "Clear failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFile = async (e, filename) => {
    e.stopPropagation(); // Don't trigger view
    setError(null);
    setBusy(true);
    try {
      await deleteSessionFile(sessionId, filename);
      // If we were viewing this file, go back
      if (viewing?.filename === filename) {
        setViewing(null);
      }
      await refresh();
      onFilesChanged?.();
    } catch (err) {
      setError(
        err?.response?.data?.detail || err?.message || "Delete failed."
      );
    } finally {
      setBusy(false);
    }
  };

  const handleViewFile = async (filename) => {
    setViewError(null);
    setViewLoading(true);
    try {
      const data = await readSessionFile(sessionId, filename);
      setViewing(data);
    } catch (err) {
      setViewError(
        err?.response?.data?.detail || err?.message || "Could not load file."
      );
    } finally {
      setViewLoading(false);
    }
  };

  // ── Document viewer ──────────────────────────────────────────────────
  if (viewing) {
    return (
      <div className="doc-viewer">
        <div className="doc-viewer__header">
          <button
            type="button"
            className="doc-viewer__back"
            onClick={() => setViewing(null)}
          >
            ← Back to files
          </button>
          <span className="doc-viewer__filename">
            {FILE_ICONS[viewing.extension] || "📄"} {viewing.filename}
          </span>
        </div>
        {viewError ? (
          <div className="doc-viewer__error">{viewError}</div>
        ) : (
          <pre className="doc-viewer__content">{viewing.content}</pre>
        )}
      </div>
    );
  }

  // ── File list view ───────────────────────────────────────────────────
  return (
    <>
      {/* Upload zone */}
      <div
        className={`upload-zone${dragOver ? " is-dragover" : ""}${busy ? " is-uploading" : ""}`}
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        aria-label="Upload a file"
      >
        <span className="upload-zone__icon" aria-hidden>
          {busy ? "⏳" : "📎"}
        </span>
        <p className="upload-zone__text">
          {busy ? "Indexing file…" : "Drop a file here or click to browse"}
        </p>
        <p className="upload-zone__hint">
          PDF, Word, text, markdown, CSV, JSON, HTML
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileInput}
          disabled={busy}
          aria-label="Choose a file to upload"
        />
      </div>

      {/* Error */}
      {error && (
        <p className="chat__error" role="alert" style={{ marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}

      {/* File list */}
      {files.length > 0 ? (
        <>
          <ul className="file-list">
            {files.map((f, i) => (
              <li
                className="file-item file-item--clickable"
                key={f.filename || i}
                onClick={() => handleViewFile(f.filename)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleViewFile(f.filename);
                  }
                }}
              >
                <span className="file-item__icon" aria-hidden>
                  {FILE_ICONS[f.extension] || "📄"}
                </span>
                <div className="file-item__info">
                  <div className="file-item__name" title={f.filename}>
                    {f.filename}
                  </div>
                  <div className="file-item__meta">
                    {formatSize(f.size_bytes || 0)}
                  </div>
                </div>
                <span className="file-item__status file-item__status--indexed">
                  Indexed
                </span>
                <button
                  type="button"
                  className="file-item__remove"
                  onClick={(e) => handleDeleteFile(e, f.filename)}
                  disabled={busy}
                  title={`Delete ${f.filename}`}
                  aria-label={`Delete ${f.filename}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="upload-zone__hint"
            style={{
              marginTop: "0.75rem",
              color: "var(--error)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.72rem",
              padding: 0,
              fontStyle: "normal",
            }}
            onClick={handleClear}
            disabled={busy}
          >
            Clear all uploads
          </button>
        </>
      ) : (
        !busy && (
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden>
              📚
            </span>
            <p className="empty-state__title">No documents yet</p>
            <p className="empty-state__text">
              Upload lecture notes, slides, or readings to get started.
            </p>
          </div>
        )
      )}
    </>
  );
}
