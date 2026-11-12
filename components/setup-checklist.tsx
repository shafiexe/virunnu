"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SetupStep = { key: string; label: string; hint: string; href: string; done: boolean };

// A short "get set up" list on the dashboard: each step ticks itself when it is done, one tap opens it, and the card goes away when
// everything is finished. It can be hidden for good by the person; the choice is remembered in this browser.
export function SetupChecklist({ steps, storageKey }: { steps: SetupStep[]; storageKey: string }) {
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => { try { setHidden(localStorage.getItem(storageKey) === "1"); } catch { /* shown */ } }, [storageKey]);
  // on a phone the list starts folded to its title and progress bar, so the dashboard itself is the first thing seen
  useEffect(() => { if (window.matchMedia("(max-width: 767px)").matches) setOpen(false); }, []);

  const done = steps.filter((s) => s.done).length;
  if (hidden || done === steps.length) return null;
  const next = steps.find((s) => !s.done);
  const pct = Math.round((done / steps.length) * 100);

  return (
    <section className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/10 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Get set up <span className="font-normal text-zinc-500">· {done} of {steps.length} done</span></h2>
          {next && <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">Next: <span className="font-medium">{next.label}</span></p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "Collapse" : "Expand"} className="p-1.5 text-zinc-400 hover:text-zinc-600">{open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          <button type="button" onClick={() => { try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ } setHidden(true); }} aria-label="Hide this list" title="Hide for good" className="p-1.5 text-zinc-400 hover:text-zinc-600"><X className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 overflow-hidden"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${Math.max(pct, 4)}%` }} /></div>
      {open && (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {steps.map((s) => (
            <li key={s.key}>
              <Link href={s.href} className={cn("flex items-start gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                s.done ? "border-transparent bg-white/50 dark:bg-zinc-900/40 opacity-70" : "border-amber-200 dark:border-amber-900/40 bg-white dark:bg-zinc-900 hover:border-amber-400")}>
                {s.done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                <span className="min-w-0"><span className={cn("block text-sm font-medium", s.done ? "text-zinc-500 line-through" : "text-zinc-900 dark:text-zinc-50")}>{s.label}</span>{!s.done && <span className="block text-xs text-zinc-500">{s.hint}</span>}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
