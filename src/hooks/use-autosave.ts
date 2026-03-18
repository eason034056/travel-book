import { useCallback, useEffect, useRef, useState } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useAutosave(
  saveFn: () => Promise<void>,
  debounceMs = 2000
) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [dirty, setDirty] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;

  const markDirty = useCallback(() => {
    setDirty(true);
    setStatus("idle");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      try {
        await saveFnRef.current();
        setStatus("saved");
        setDirty(false);
        setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 3000);
      } catch {
        setStatus("error");
      }
    }, debounceMs);
  }, [debounceMs]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setStatus("saving");
    try {
      await saveFnRef.current();
      setStatus("saved");
      setDirty(false);
      setTimeout(() => setStatus((current) => (current === "saved" ? "idle" : current)), 3000);
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { status, dirty, markDirty, saveNow };
}
