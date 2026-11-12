"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type Hit = { kind: string; title: string; sub: string; href: string };

const KIND_STYLE: Record<string, string> = {
  Invoice: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  Quotation: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  Customer: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  Order: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Supplier: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
  Booking: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  Team: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300",
};

// Type a name, a phone number, an invoice number (#14) or a quotation (Q-4) and Enter takes you straight there.
// Opens from the Search button, or with "/" or Ctrl/⌘ + K from anywhere.
export function CatererQuickFind({ variant, endpoint = "/api/caterer/find", placeholder = "Customer, phone, invoice #14, quotation Q-4…", hint }: { variant: "sidebar" | "icon"; endpoint?: string; placeholder?: string; hint?: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [at, setAt] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // the sidebar and the phone tabs are both on the page; only the sidebar one answers the keyboard
    if (variant !== "sidebar") return;
    const key = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) { e.preventDefault(); setOpen(true); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [variant]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- the search starts empty each time it opens
  useEffect(() => { if (open) { setQ(""); setHits([]); setAt(0); requestAnimationFrame(() => input.current?.focus()); } }, [open]);

  useEffect(() => {
    if (!open) return;
    /* eslint-disable react-hooks/set-state-in-effect -- the results follow what is typed */
    if (!q.trim()) { setHits([]); return; }
    setLoading(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const t = setTimeout(async () => {
      try {
        const data = await fetch(`${endpoint}?q=${encodeURIComponent(q)}`).then((r) => r.json());
        setHits(data.hits ?? []); setAt(0);
      } catch { /* keep what was shown */ } finally { setLoading(false); }
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  const go = (h: Hit | undefined) => { if (!h) return; setOpen(false); router.push(h.href); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setAt((i) => Math.min(hits.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setAt((i) => Math.max(0, i - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); go(hits[at]); }
  };

  return (
    <>
      {variant === "sidebar" ? (
        <button type="button" onClick={() => setOpen(true)} className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-amber-300 transition-colors">
          <Search className="h-4 w-4" /><span className="flex-1 text-left">Search</span><kbd className="rounded border border-zinc-200 dark:border-zinc-700 px-1.5 text-[10px] text-zinc-400">/</kbd>
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} aria-label="Search" className="flex items-center px-3 py-3 text-zinc-500 border-b-2 border-transparent"><Search className="h-4 w-4" /></button>
      )}
      {open && (
        <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 px-4">
              <Search className="h-4 w-4 text-zinc-400 shrink-0" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={placeholder} aria-label="Search"
                className="flex-1 bg-transparent py-3.5 text-base text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none" />
              {loading && <span className="text-[11px] text-zinc-400">…</span>}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-1">
              {hits.map((h, i) => (
                <li key={h.href + h.title}>
                  <button type="button" onMouseEnter={() => setAt(i)} onClick={() => go(h)} className={cn("w-full flex items-center gap-3 px-4 py-2.5 text-left", i === at && "bg-amber-50 dark:bg-amber-950/20")}>
                    <span className={cn("w-[4.5rem] shrink-0 rounded-md px-1.5 py-0.5 text-center text-[11px] font-semibold", KIND_STYLE[h.kind])}>{h.kind}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">{h.title}</span><span className="block truncate text-xs text-zinc-500">{h.sub}</span></span>
                    {i === at && <kbd className="text-[10px] text-zinc-400">Enter ↵</kbd>}
                  </button>
                </li>
              ))}
              {q.trim() && !loading && hits.length === 0 && <li className="px-4 py-8 text-center text-sm text-zinc-400">Nothing found for “{q}”.</li>}
              {!q.trim() && <li className="px-4 py-6 text-center text-xs text-zinc-400">{hint ?? <>Try a name, a phone number, <b>#14</b> for an invoice, or <b>Q-4</b> for a quotation.</>}</li>}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
