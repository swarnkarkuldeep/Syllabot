import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  FileTextIcon,
  NoteIcon,
  FileDocIcon,
  TableIcon,
  GlobeIcon,
  UploadSimpleIcon,
  XIcon,
  TrashIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { deleteSession, uploadFile, deleteSessionFile, readSessionFile } from "../api";
import { fileKind, formatSize } from "../lib/fileKinds";

const ACCEPT = ".pdf,.txt,.md,.docx,.csv,.json,.html";

const KIND_ICONS = {
  PDF: FileTextIcon,
  Word: FileDocIcon,
  Notes: NoteIcon,
  Data: TableIcon,
  "Web page": GlobeIcon,
  File: FileTextIcon,
};

export function KindIcon({ ext, size = 16 }) {
  const Icon = KIND_ICONS[fileKind(ext).label] || FileTextIcon;
  return <Icon size={size} weight="fill" />;
}

const rowMotion = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, x: 24, transition: { duration: 0.18 } },
};

/** Upload, list, view and remove the session's course files. */
export default function FileUpload({ sessionId, files, onRefresh, inputRef }) {
  const reduce = useReducedMotion();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [viewing, setViewing] = useState(null); // { filename, content, extension }

  const fail = (err, fallback) =>
    setError(err?.response?.data?.detail || err?.message || fallback);

  const handleUpload = async (file) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      await uploadFile(sessionId, file);
      await onRefresh();
    } catch (err) {
      fail(err, "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef?.current) inputRef.current.value = "";
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files?.[0]);
  };

  const handleClear = async () => {
    setError(null);
    setBusy(true);
    try {
      await deleteSession(sessionId);
      setViewing(null);
      await onRefresh();
    } catch (err) {
      fail(err, "Couldn't clear the files.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    setError(null);
    setBusy(true);
    try {
      await deleteSessionFile(sessionId, filename);
      if (viewing?.filename === filename) setViewing(null);
      await onRefresh();
    } catch (err) {
      fail(err, "Couldn't delete the file.");
    } finally {
      setBusy(false);
    }
  };

  const handleViewFile = async (filename) => {
    setError(null);
    try {
      setViewing(await readSessionFile(sessionId, filename));
    } catch (err) {
      fail(err, "Couldn't open the file.");
    }
  };

  const openPicker = () => inputRef?.current?.click();

  return (
    <div className="docs">
      <div
        className={`upload${dragOver ? " is-dragover" : ""}${busy ? " is-busy" : ""}`}
        onClick={openPicker}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        aria-label="Upload a file"
      >
        <span className="upload__disc" aria-hidden>
          {busy ? (
            <CircleNotchIcon size={18} weight="bold" className="spin" />
          ) : (
            <UploadSimpleIcon size={18} weight="bold" />
          )}
        </span>
        <span className="upload__text">
          <span className="upload__title">
            {busy ? "Reading your file…" : dragOver ? "Drop to upload" : "Add a file"}
          </span>
          <span className="upload__hint">Drop it here or click to browse</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={busy}
          hidden
          aria-label="Choose a file to upload"
        />
      </div>

      {error && (
        <p className="docs__error" role="alert">
          {error}
        </p>
      )}

      {files.length > 0 && (
        <>
          <motion.ul className="docs__list" layout={!reduce}>
            <AnimatePresence initial={false}>
              {files.map((f) => {
                const kind = fileKind(f.extension);
                return (
                  <motion.li
                    key={f.filename}
                    className="doc-row"
                    layout={!reduce}
                    {...(reduce ? {} : rowMotion)}
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  >
                    <button
                      type="button"
                      className="doc-row__open"
                      onClick={() => handleViewFile(f.filename)}
                      title={`Open ${f.filename}`}
                    >
                      <span className={`doc-row__chip chip--${kind.tint}`} aria-hidden>
                        <KindIcon ext={f.extension} />
                      </span>
                      <span className="doc-row__info">
                        <span className="doc-row__name">{f.filename}</span>
                        <span className="doc-row__meta">
                          {kind.label}, {formatSize(f.size_bytes || 0)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="doc-row__remove"
                      onClick={() => handleDeleteFile(f.filename)}
                      disabled={busy}
                      title={`Delete ${f.filename}`}
                      aria-label={`Delete ${f.filename}`}
                    >
                      <TrashIcon size={15} />
                    </button>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </motion.ul>
          <button type="button" className="docs__clear" onClick={handleClear} disabled={busy}>
            Remove all files
          </button>
        </>
      )}

      <AnimatePresence>
        {viewing && (
          <motion.div
            className="viewer"
            role="dialog"
            aria-label={viewing.filename}
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 380, damping: 36 }}
          >
            <div className="viewer__head">
              <span className={`doc-row__chip chip--${fileKind(viewing.extension).tint}`} aria-hidden>
                <KindIcon ext={viewing.extension} />
              </span>
              <span className="viewer__name">{viewing.filename}</span>
              <button
                type="button"
                className="viewer__close"
                onClick={() => setViewing(null)}
                aria-label="Close file"
                autoFocus
              >
                <XIcon size={16} weight="bold" />
              </button>
            </div>
            <pre className="viewer__body">{viewing.content}</pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
