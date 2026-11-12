"use client";

/* eslint-disable react-hooks/refs -- the pending map is filled in the same step that adds the toast, so reading it while drawing is safe */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, X } from "lucide-react";

type Request = { url: string; method: "DELETE" | "POST" | "PATCH"; body?: object };
type Item = { id: number; message: string; ms: number };
type Options = {
  /** the call that really does it. Made after the wait unless the person taps Undo, or straight away when `restore` is given */
  request: Request;
  /** for things that should change on screen right away: the call that puts it back if Undo is tapped */
  restore?: Request;
  /** runs straight away so the screen can hide what is being removed */
  onStart?: () => void;
  /** runs when Undo is tapped, to bring it back on screen */
  onUndo?: () => void;
  /** runs once the change is really made */
  onDone?: () => void;
  ms?: number;
};

type Ctx = { undoable: (message: string, o: Options) => void; notify: (message: string) => void };
const ToastCtx = createContext<Ctx | null>(null);

const WAIT = 6000;

// A message that gives a few seconds to take back what was just done, instead of asking "are you sure?" first.
// The change is only sent once the wait is over, so Undo really does leave everything as it was.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const pending = useRef(new Map<number, { timer: ReturnType<typeof setTimeout>; options: Options }>());
  const nextId = useRef(1);

  const fire = useCallback(async (request: Request, keepalive = false) => {
    try {
      await fetch(request.url, {
        method: request.method, keepalive,
        headers: request.body ? { "Content-Type": "application/json" } : undefined,
        body: request.body ? JSON.stringify(request.body) : undefined,
      });
    } catch { /* the page is going away or the network dropped: nothing more to do */ }
  }, []);

  const drop = (id: number) => setItems((l) => l.filter((x) => x.id !== id));

  const undoable = useCallback((message: string, options: Options) => {
    const id = nextId.current++;
    const ms = options.ms ?? WAIT;
    options.onStart?.();
    setItems((l) => [...l.slice(-2), { id, message, ms }]);
    if (options.restore) {
      // done now; Undo makes the opposite call
      fire(options.request).then(() => { options.onDone?.(); router.refresh(); });
      const timer = setTimeout(() => { pending.current.delete(id); drop(id); }, ms);
      pending.current.set(id, { timer, options });
      return;
    }
    const timer = setTimeout(async () => {
      pending.current.delete(id); drop(id);
      await fire(options.request);
      options.onDone?.(); router.refresh();
    }, ms);
    pending.current.set(id, { timer, options });
  }, [fire, router]);

  const notify = useCallback((message: string) => {
    const id = nextId.current++;
    setItems((l) => [...l.slice(-2), { id, message, ms: 3500 }]);
    setTimeout(() => drop(id), 3500);
  }, []);

  const undo = (id: number) => {
    const p = pending.current.get(id);
    if (!p) return;
    clearTimeout(p.timer); pending.current.delete(id); drop(id);
    if (p.options.restore) fire(p.options.restore).then(() => { p.options.onUndo?.(); router.refresh(); });
    else p.options.onUndo?.();
  };

  // Leaving the page (or closing the tab) before the wait is over still makes the change; it can no longer be undone
  useEffect(() => {
    const flush = () => { for (const [id, p] of pending.current) { clearTimeout(p.timer); if (!p.options.restore) fire(p.options.request, true); pending.current.delete(id); } };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, [fire]);

  const value = useMemo(() => ({ undoable, notify }), [undoable, notify]);

  return (
    <ToastCtx.Provider value={value}>
      {children}
      <div className="fixed z-[60] inset-x-0 bottom-20 md:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className="pointer-events-auto relative overflow-hidden flex items-center gap-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 pl-4 pr-2 py-2 shadow-lg text-sm max-w-md w-full sm:w-auto">
            <span className="flex-1">{t.message}</span>
            {pending.current.has(t.id) && (
              <button type="button" onClick={() => undo(t.id)} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 min-h-9 font-semibold text-amber-300 dark:text-amber-600 hover:bg-white/10 dark:hover:bg-black/5">
                <Undo2 className="h-4 w-4" /> Undo
              </button>
            )}
            <button type="button" onClick={() => drop(t.id)} aria-label="Dismiss" className="p-2 text-zinc-400"><X className="h-4 w-4" /></button>
            {pending.current.has(t.id) && <span className="absolute left-0 bottom-0 h-0.5 bg-amber-400" style={{ animation: `undo-shrink ${t.ms}ms linear forwards` }} />}
          </div>
        ))}
      </div>
      <style>{`@keyframes undo-shrink { from { width: 100% } to { width: 0 } }`}</style>
    </ToastCtx.Provider>
  );
}

export function useUndoable() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useUndoable needs a ToastProvider above it");
  return ctx;
}
