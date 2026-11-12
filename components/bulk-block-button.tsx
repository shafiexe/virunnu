"use client";

import { useState } from "react";
import { CalendarX2, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INPUT = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

// Block a run of days in one go: a holiday week, a renovation, "every Monday". Days that already have a booking are left open.
export function BulkBlockButton({ hallId, from }: { hallId?: string; from?: string | null }) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(from ?? "");
  const [end, setEnd] = useState(from ?? "");
  const [reason, setReason] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  if (!hallId) return null;

  async function go() {
    if (!start || !end) { setError("Choose the first and last day"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/owner/blocked-dates/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hallId, from: start, to: end, reason: reason || undefined, ...(weekdays.length ? { weekdays } : {}) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not block"); return; }
      const skipped = data.skippedBooked?.length ? ` ${data.skippedBooked.length} day${data.skippedBooked.length === 1 ? " has" : "s have"} a booking and stayed open.` : "";
      setResult(`Blocked ${data.blocked} day${data.blocked === 1 ? "" : "s"}.${skipped}`);
      setTimeout(() => window.location.reload(), 1400);
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setStart(from ?? start); setEnd(from ?? end); setResult(""); setError(""); setOpen(true); }}
        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
        <CalendarX2 className="h-3.5 w-3.5" /> Block several days
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Block several days</h3><p className="text-xs text-zinc-500 mt-0.5">Days that already have a booking stay open.</p></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-zinc-400" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">From</span><input type="date" className={INPUT} value={start} onChange={(e) => { setStart(e.target.value); if (!end || e.target.value > end) setEnd(e.target.value); }} /></label>
              <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">To</span><input type="date" className={INPUT} value={end} min={start} onChange={(e) => setEnd(e.target.value)} /></label>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 mb-1.5">Only these days of the week <span className="text-zinc-400">(optional)</span></div>
              <div className="flex gap-1">
                {DAYS.map((d, i) => (
                  <button key={d} type="button" onClick={() => setWeekdays((w) => (w.includes(i) ? w.filter((x) => x !== i) : [...w, i]))}
                    className={cn("flex-1 rounded-lg border py-1.5 text-[11px] font-semibold", weekdays.includes(i) ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-500")}>{d}</button>
                ))}
              </div>
            </div>
            <label className="block space-y-1"><span className="text-xs font-medium text-zinc-500">Reason (optional)</span><input className={INPUT} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Repairs" maxLength={200} /></label>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {result && <p className="text-sm text-emerald-600">{result}</p>}
            <button type="button" onClick={go} disabled={busy || !!result} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Block these days
            </button>
          </div>
        </div>
      )}
    </>
  );
}
