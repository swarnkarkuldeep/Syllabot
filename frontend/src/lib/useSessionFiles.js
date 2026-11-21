import { useCallback, useEffect, useRef, useState } from "react";
import { listSessionFiles } from "../api";

/** File list for a session, shared by the materials grid and the panel.
 *  A failing backend reads as "no files" rather than an error. */
export function useSessionFiles(sessionId) {
  const [files, setFiles] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const current = useRef(sessionId);
  current.current = sessionId;

  const refresh = useCallback(async () => {
    let next = [];
    try {
      const res = await listSessionFiles(sessionId);
      next = res?.files || [];
    } catch {
      next = [];
    }
    // Drop answers for a session that is no longer the current one.
    if (current.current !== sessionId) return;
    setFiles(next);
    setLoaded(true);
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { files, refresh, loaded };
}
