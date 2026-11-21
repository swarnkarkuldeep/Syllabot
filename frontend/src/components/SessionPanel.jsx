import ActivityChart from "./ActivityChart";
import FileUpload from "./FileUpload";

/** Right-hand panel: what happened this session, and the files behind it. */
export default function SessionPanel({
  sessionId,
  messages,
  files,
  onRefresh,
  uploadInputRef,
  headingRef,
}) {
  return (
    <aside className="panel" aria-label="Session">
      <div className="panel__scroll">
        <h2 className="panel__title" tabIndex={-1} ref={headingRef}>
          This session
        </h2>
        <ActivityChart messages={messages} />

        <div className="panel__section-head">
          <h2 className="panel__title">Documents</h2>
          {files.length > 0 && <span className="panel__count">{files.length}</span>}
        </div>
        <FileUpload
          sessionId={sessionId}
          files={files}
          onRefresh={onRefresh}
          inputRef={uploadInputRef}
        />
      </div>
    </aside>
  );
}
