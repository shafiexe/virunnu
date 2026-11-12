"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_AGE = 3 * 86400000;

// Keeps a half-filled form in this browser so leaving the page, a dropped connection or a phone call doesn't lose it.
// `pending` is an earlier unfinished draft waiting for the person to continue or throw away.
export function useDraft<T>(key: string, value: T, { enabled, meaningful }: { enabled: boolean; meaningful: (v: T) => boolean }) {
  const [pending, setPending] = useState<{ value: T; at: number } | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const d = JSON.parse(raw) as { value: T; at: number };
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reads the saved draft from this browser once on open
        if (Date.now() - d.at < MAX_AGE && meaningful(d.value)) setPending(d);
        else localStorage.removeItem(key);
      }
    } catch { /* no storage: the form just works without drafts */ }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  useEffect(() => {
    // while an old draft is waiting for an answer, don't overwrite it with the empty form
    if (!enabled || !ready.current || pending) return;
    const t = setTimeout(() => {
      try {
        if (meaningful(value)) localStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
        else localStorage.removeItem(key);
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, enabled, pending, key]);

  const clear = useCallback(() => { try { localStorage.removeItem(key); } catch { /* ignore */ } setPending(null); }, [key]);
  return { pending, dismiss: () => setPending(null), clear };
}
