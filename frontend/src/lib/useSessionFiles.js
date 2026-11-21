import { useCallback, useEffect, useState } from "react";
import { listSessionFiles } from "../api";

/** File list for a session, shared by the materials grid and the panel.
 *  A failing backend reads as "no files" rather than an error. */
export function useSessionFiles(sessionId) {
  const [files, setFiles] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await listSessionFiles(sessionId);
      setFiles(res?.files || []);
    } catch {
      setFiles([]);
    } finally {
      setLoaded(true);
    }
  }, [sessionId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { files, refresh, loaded };
}
