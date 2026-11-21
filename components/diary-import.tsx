"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, Check, ImagePlus, Loader2, Plus, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { downscaleToJpeg } from "@/lib/image-downscale";
import { CHECK_TEXT, rowProblem, type BulkRow, type DiaryEntry, type RowCheck } from "@/lib/diary";

type SlotTemplate = { id: string; name: string; startTime: string; endTime: string };
type Hall = { id: string; name: string; pricePerSlot: number; slotTemplates: SlotTemplate[] };
type Page = { id: string; name: string; url: string; status: "wait" | "reading" | "done" | "failed"; found: number; error?: string };
type Row = { id: string; page: number; date: string; templateId: string; name: string; phone: string; total: string; advance: string; yearAssumed: boolean; slotAssumed: boolean; priceAssumed: boolean; include: boolean };
type Step = "photos" | "reading" | "review" | "confirm" | "done";

const MAX_PAGES = 20;
const FIELD = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";
const COLS = "md:grid-cols-[140px_190px_minmax(0,1fr)_130px_100px_100px_36px]";
const rs = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const longDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
// a small label above a field on phones; on wide screens the column headings do the job
function Lbl({ text, className, children }: { text: string; className?: string; children: React.ReactNode }) {
  return <label className={cn("block min-w-0", className)}><span className="mb-1 block text-[11px] font-medium text-zinc-500 md:sr-only">{text}</span>{children}</label>;
}
let counter = 0;
const uid = () => `r${Date.now().toString(36)}${counter++}`;

// "Import from diary": the owner photographs pages of the paper diary, the entries are read into a list, and nothing is saved
// until the owner has checked the list and confirmed it.
export function DiaryImport({ venueId, hall, onDone }: { venueId: string; hall?: Hall; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("photos");
  const [pages, setPages] = useState<Page[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [checks, setChecks] = useState<Record<string, RowCheck>>({});
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [askClose, setAskClose] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(null);
  const files = useRef(new Map<string, File>());
  const runId = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  const templates = hall?.slotTemplates ?? [];
  const priceRupees = hall ? Math.round(hall.pricePerSlot / 100) : 0;

  function reset() {
    for (const p of pages) URL.revokeObjectURL(p.url);
    files.current.clear();
    setStep("photos"); setPages([]); setRows([]); setChecks({}); setError(""); setAskClose(false); setResult(null);
  }
  function close() { reset(); setOpen(false); }
  function tryClose() {
    if (saving || step === "reading") return;
    if (step === "review" || step === "confirm") setAskClose(true);
    else close();
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") tryClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function addFiles(list: FileList | File[]) {
    const images = [...list].filter((f) => f.type.startsWith("image/"));
    if (images.length === 0) { setError("Choose photos of the diary pages."); return; }
    const room = Math.max(MAX_PAGES - pages.length, 0);
    setError(images.length > room ? `Up to ${MAX_PAGES} pages at a time. ${room > 0 ? `The first ${room} were added.` : "Remove a page to add another."}` : "");
    const added: Page[] = images.slice(0, room).map((f) => {
      const id = uid();
      files.current.set(id, f);
      return { id, name: f.name, url: URL.createObjectURL(f), status: "wait", found: 0 };
    });
    setPages((cur) => [...cur, ...added]);
  }

  function toRow(e: DiaryEntry, page: number): Row {
    return {
      id: uid(), page,
      date: e.date ?? "", templateId: e.templateId ?? templates[0]?.id ?? "",
      name: e.name ?? "", phone: e.phone ?? "",
      total: e.totalRupees != null ? String(e.totalRupees) : priceRupees ? String(priceRupees) : "",
      advance: e.advanceRupees != null ? String(e.advanceRupees) : "",
      yearAssumed: e.yearAssumed && !!e.date, slotAssumed: e.slotAssumed, priceAssumed: e.totalRupees == null && priceRupees > 0,
      include: true,
    };
  }

  async function readPage(p: Page, index: number): Promise<Row[] | null> {
    const file = files.current.get(p.id);
    if (!file || !hall) return null;
    setPages((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: "reading", error: undefined } : x)));
    try {
      const img = await downscaleToJpeg(file);
      const res = await fetch("/api/owner/diary-read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hallId: hall.id, image: img.base64, mediaType: img.mediaType }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not read this page");
      const found = (data.entries as DiaryEntry[]).map((e) => toRow(e, index + 1));
      setPages((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: "done", found: found.length } : x)));
      return found;
    } catch (e) {
      setPages((cur) => cur.map((x) => (x.id === p.id ? { ...x, status: "failed", error: e instanceof Error ? e.message : "Could not read this page" } : x)));
      return null;
    }
  }

  // reads the pages two at a time; pages already read are left alone, so "Try again" only redoes the failed ones
  async function readAll() {
    setStep("reading"); setError("");
    const todo = pages.map((p, i) => ({ p, i })).filter(({ p }) => p.status !== "done");
    const queue = [...todo];
    const got: Row[] = [];
    await Promise.all([0, 1].map(async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const found = await readPage(job.p, job.i);
        if (found) got.push(...found);
      }
    }));
    setRows((cur) => [...cur, ...got].sort((a, b) => a.page - b.page || a.date.localeCompare(b.date)));
    setStep("review");
  }

  const bulkRow = (r: Row): BulkRow => ({
    date: r.date, templateId: r.templateId, name: r.name.trim() || undefined, phone: r.phone.replace(/\D/g, "") || undefined,
    totalRupees: Math.round(Number(r.total)), advanceRupees: r.advance ? Math.round(Number(r.advance)) : undefined,
  });
  const localProblem = (r: Row) => rowProblem({ date: r.date || null, templateId: r.templateId || null, name: r.name || null, phone: r.phone || null, totalRupees: r.total ? Math.round(Number(r.total)) : null, advanceRupees: r.advance ? Math.round(Number(r.advance)) : null });

  // asks the server about every row that looks complete (nothing is changed), so conflicts show before the owner confirms
  const check = useCallback(async (list: Row[]) => {
    if (!hall) return;
    const id = ++runId.current;
    const valid = list.filter((r) => !localProblem(r));
    const next: Record<string, RowCheck> = {};
    for (const r of list) if (localProblem(r)) next[r.id] = "invalid";
    if (valid.length > 0) {
      setChecking(true);
      try {
        const res = await fetch("/api/owner/bookings/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueId, hallId: hall.id, apply: false, rows: valid.slice(0, 200).map(bulkRow) }) });
        const data = await res.json().catch(() => ({}));
        if (id !== runId.current) return;
        if (res.ok) valid.slice(0, 200).forEach((r, i) => { next[r.id] = (data.checks as RowCheck[])[i]; });
        else setError(data.error ?? "Could not check the list");
      } finally { if (id === runId.current) setChecking(false); }
    }
    if (id === runId.current) setChecks(next);
  }, [hall, venueId]);

  useEffect(() => {
    if (step !== "review") return;
    const t = setTimeout(() => { void check(rows); }, 400);
    return () => clearTimeout(t);
  }, [rows, step, check]);

  const patch = (id: string, p: Partial<Row>) => setRows((cur) => cur.map((r) => (r.id === id ? { ...r, ...p, ...("date" in p ? { yearAssumed: false } : {}), ...("templateId" in p ? { slotAssumed: false } : {}), ...("total" in p ? { priceAssumed: false } : {}) } : r)));
  const checkOf = (r: Row): RowCheck => checks[r.id] ?? (localProblem(r) ? "invalid" : "ok");
  const addable = rows.filter((r) => r.include && checkOf(r) === "ok" && !checking);
  const skipped = rows.length - rows.filter((r) => r.include && checkOf(r) === "ok").length;
  const sumTotal = addable.reduce((s, r) => s + Math.round(Number(r.total)), 0);
  const sumAdvance = addable.reduce((s, r) => s + (r.advance ? Math.round(Number(r.advance)) : 0), 0);
  const dates = addable.map((r) => r.date).sort();

  async function save() {
    if (!hall) return;
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/owner/bookings/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ venueId, hallId: hall.id, apply: true, rows: addable.map(bulkRow) }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not add the bookings"); return; }
      setResult({ added: data.added, skipped: addable.length - data.added });
      setStep("done");
    } finally { setSaving(false); }
  }

  if (!hall || templates.length === 0) return null;
  const readyForReview = pages.length > 0;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 md:py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <BookOpen className="h-3.5 w-3.5" /> Import from diary
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onMouseDown={(e) => { if (e.target === e.currentTarget) tryClose(); }}>
          <div role="dialog" aria-modal="true" aria-label="Import bookings from your diary" className="flex max-h-[94dvh] w-full max-w-5xl flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Import from your diary</h2>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {step === "photos" && "Step 1 of 3 · Add photos of the pages"}
                  {step === "reading" && "Step 2 of 3 · Reading the pages"}
                  {(step === "review" || step === "confirm") && "Step 3 of 3 · Check the list, then confirm. Nothing is saved yet."}
                  {step === "done" && "Finished"}
                </p>
              </div>
              <button type="button" onClick={tryClose} aria-label="Close" disabled={saving || step === "reading"} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"><X className="h-5 w-5" /></button>
            </div>

            {askClose && (
              <div role="alert" className="flex flex-wrap items-center gap-3 bg-amber-50 dark:bg-amber-950/30 px-5 py-3 text-sm text-amber-900 dark:text-amber-200">
                <span className="font-medium">Throw away this list? The {rows.length} entries will not be saved.</span>
                <button type="button" onClick={close} className="rounded-lg bg-zinc-900 px-3 py-2 md:py-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">Yes, discard</button>
                <button type="button" onClick={() => setAskClose(false)} className="rounded-lg border border-amber-300 px-3 py-2 md:py-1.5 text-xs font-semibold">Keep working</button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {step === "photos" && (
                <>
                  <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
                    className="rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-8 text-center">
                    <ImagePlus className="mx-auto h-8 w-8 text-zinc-400" />
                    <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">Add photos of the diary pages</p>
                    <p className="mt-1 text-sm text-zinc-500">One photo per page, flat and in good light. Up to {MAX_PAGES} pages. Each page can have many bookings.</p>
                    <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-zinc-900">Choose photos</button>
                    <input ref={input} type="file" accept="image/*" multiple className="sr-only" aria-label="Choose diary photos" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                  </div>
                  <ul className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {pages.map((p, i) => (
                      <li key={p.id} className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the chosen photo */}
                        <img src={p.url} alt={`Diary page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Page {i + 1}</span>
                        <button type="button" aria-label={`Remove page ${i + 1}`} onClick={() => { URL.revokeObjectURL(p.url); files.current.delete(p.id); setPages((cur) => cur.filter((x) => x.id !== p.id)); }} className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white"><X className="h-3 w-3" /></button>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-zinc-500">The photos are only read to make the list. They are not kept. If a page does not say the time of day, Morning is used. If it does not say the year, this year is used.</p>
                </>
              )}

              {(step === "reading" || (step === "review" && pages.some((p) => p.status === "failed"))) && (
                <ul className="space-y-2">
                  {pages.map((p, i) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3 py-2.5 text-sm">
                      {p.status === "reading" || p.status === "wait" ? <Loader2 className={cn("h-4 w-4 text-amber-500", p.status === "reading" && "animate-spin")} /> : p.status === "done" ? <Check className="h-4 w-4 text-emerald-600" /> : <TriangleAlert className="h-4 w-4 text-rose-600" />}
                      <span className="font-medium">Page {i + 1}</span>
                      <span className="text-zinc-500 truncate">{p.status === "wait" ? "Waiting" : p.status === "reading" ? "Reading…" : p.status === "done" ? `${p.found} entr${p.found === 1 ? "y" : "ies"} found` : p.error}</span>
                    </li>
                  ))}
                </ul>
              )}

              {step === "review" && (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-zinc-600 dark:text-zinc-300" aria-live="polite">
                      <strong>{rows.length}</strong> entr{rows.length === 1 ? "y" : "ies"} found · <strong className="text-emerald-700 dark:text-emerald-400">{rows.filter((r) => r.include && checkOf(r) === "ok").length} ready</strong>{skipped > 0 && <> · <strong className="text-amber-700 dark:text-amber-400">{skipped} will be skipped</strong></>}{checking && <span className="ml-2 text-zinc-400">Checking…</span>}
                    </p>
                    <button type="button" onClick={() => setRows((cur) => [...cur, { id: uid(), page: 0, date: "", templateId: templates[0].id, name: "", phone: "", total: priceRupees ? String(priceRupees) : "", advance: "", yearAssumed: false, slotAssumed: false, priceAssumed: priceRupees > 0, include: true }])} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 md:py-1.5 text-xs font-semibold"><Plus className="h-3.5 w-3.5" /> Add a row</button>
                    {pages.some((p) => p.status === "failed") && <button type="button" onClick={() => void readAll()} className="rounded-lg bg-amber-500 px-3 py-2 md:py-1.5 text-xs font-semibold text-zinc-900">Try the failed pages again</button>}
                  </div>
                  {rows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 px-6 py-10 text-center text-sm text-zinc-500">No bookings were found on these pages. Try a clearer photo, or add rows by hand.</div>
                  ) : (
                    <div className="space-y-2">
                      <div className={cn("hidden md:grid gap-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500", COLS)}>
                        <span>Date</span><span>Slot</span><span>Name</span><span>Phone</span><span>Total ₹</span><span>Advance ₹</span><span />
                      </div>
                      {rows.map((r) => {
                        const c = checkOf(r);
                        const ok = c === "ok";
                        return (
                          <div key={r.id} className={cn("rounded-xl border px-3 py-2.5 space-y-2", ok ? "border-zinc-200 dark:border-zinc-700" : "border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/10", !r.include && "opacity-60")}>
                            <div className={cn("grid grid-cols-2 gap-2", COLS)}>
                              <Lbl text="Date" className="col-span-1"><input type="date" aria-label="Date" value={r.date} onChange={(e) => patch(r.id, { date: e.target.value })} className={cn(FIELD, "col-span-1", !r.date && "border-rose-400")} /></Lbl>
                              <Lbl text="Slot" className="col-span-1"><select aria-label="Slot" value={r.templateId} onChange={(e) => patch(r.id, { templateId: e.target.value })} className={cn(FIELD, "col-span-1")}>
                                {templates.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.startTime}</option>)}
                              </select></Lbl>
                              <Lbl text="Name" className="col-span-2 md:col-span-1"><input aria-label="Name" placeholder="Name" value={r.name} onChange={(e) => patch(r.id, { name: e.target.value })} className={cn(FIELD, "col-span-2 md:col-span-1")} /></Lbl>
                              <Lbl text="Phone" className="col-span-1"><input aria-label="Phone" placeholder="Phone" inputMode="numeric" value={r.phone} onChange={(e) => patch(r.id, { phone: e.target.value.replace(/[^\d+ ]/g, "") })} className={cn(FIELD, "col-span-1")} /></Lbl>
                              <Lbl text="Total ₹" className="col-span-1"><input aria-label="Total amount in rupees" placeholder="Total" inputMode="numeric" value={r.total} onChange={(e) => patch(r.id, { total: e.target.value.replace(/\D/g, "") })} className={cn(FIELD, "col-span-1", !r.total && "border-rose-400")} /></Lbl>
                              <Lbl text="Advance ₹" className="col-span-1"><input aria-label="Advance in rupees" placeholder="Advance" inputMode="numeric" value={r.advance} onChange={(e) => patch(r.id, { advance: e.target.value.replace(/\D/g, "") })} className={cn(FIELD, "col-span-1")} /></Lbl>
                              <button type="button" aria-label="Remove this row" onClick={() => setRows((cur) => cur.filter((x) => x.id !== r.id))} className="col-span-1 justify-self-end rounded-lg p-2 text-zinc-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
                              <label className="inline-flex items-center gap-1.5 font-medium text-zinc-700 dark:text-zinc-200">
                                <input type="checkbox" checked={r.include && ok} disabled={!ok} onChange={(e) => patch(r.id, { include: e.target.checked })} className="h-4 w-4 accent-amber-500" /> Add this booking
                              </label>
                              <span className={cn("rounded-full px-2 py-0.5 font-semibold", ok ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" : "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200")}>{CHECK_TEXT[c]}</span>
                              {r.yearAssumed && <span className="text-amber-700 dark:text-amber-400">Year not written · used this year</span>}
                              {r.slotAssumed && <span className="text-zinc-500">Slot not written · used {templates.find((t) => t.id === r.templateId)?.name}</span>}
                              {r.priceAssumed && <span className="text-zinc-500">Amount not written · used the hall price</span>}
                              {!r.phone && r.name && <span className="text-zinc-500">No phone · saved by name only</span>}
                              {r.page > 0 && pages[r.page - 1] && <a href={pages[r.page - 1].url} target="_blank" rel="noopener noreferrer" className="ml-auto font-medium text-amber-700 dark:text-amber-400 hover:underline">See page {r.page}</a>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {step === "confirm" && (
                <div className="mx-auto max-w-lg space-y-4 py-4">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Add {addable.length} booking{addable.length === 1 ? "" : "s"}?</h3>
                  <dl className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-sm">
                    <div className="flex justify-between px-4 py-2.5"><dt className="text-zinc-500">Bookings to add</dt><dd className="font-semibold">{addable.length}</dd></div>
                    <div className="flex justify-between px-4 py-2.5"><dt className="text-zinc-500">Dates</dt><dd className="font-semibold">{dates.length ? `${longDate(dates[0])} to ${longDate(dates[dates.length - 1])}` : "—"}</dd></div>
                    <div className="flex justify-between px-4 py-2.5"><dt className="text-zinc-500">Total value</dt><dd className="font-semibold">{rs(sumTotal)}</dd></div>
                    <div className="flex justify-between px-4 py-2.5"><dt className="text-zinc-500">Advance recorded</dt><dd className="font-semibold">{rs(sumAdvance)}</dd></div>
                    {skipped > 0 && <div className="flex justify-between px-4 py-2.5"><dt className="text-zinc-500">Left out</dt><dd className="font-semibold text-amber-700 dark:text-amber-400">{skipped}</dd></div>}
                  </dl>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-600 dark:text-zinc-300">
                    <li>The calendar will show these dates as booked.</li>
                    <li>No messages or emails are sent to these customers.</li>
                    <li>Slots that are already booked are never changed.</li>
                    <li>If something is wrong, you can cancel a booking one by one afterwards.</li>
                  </ul>
                </div>
              )}

              {step === "done" && result && (
                <div className="mx-auto max-w-md space-y-3 py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40"><Check className="h-6 w-6 text-emerald-600" /></div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Added {result.added} booking{result.added === 1 ? "" : "s"}</h3>
                  {result.skipped > 0 && <p className="text-sm text-amber-700 dark:text-amber-400">{result.skipped} could not be added because the slot was taken in the meantime.</p>}
                  <p className="text-sm text-zinc-500">They are on your calendar now.</p>
                </div>
              )}

              {error && <p role="alert" className="rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 dark:border-zinc-800 px-5 py-3" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
              {step === "photos" && <button type="button" disabled={!readyForReview} onClick={() => void readAll()} className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 px-5 py-2.5 text-sm font-semibold text-zinc-900">Read {pages.length || ""} page{pages.length === 1 ? "" : "s"}</button>}
              {step === "reading" && <span className="inline-flex items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Reading, please wait…</span>}
              {step === "review" && (
                <>
                  <button type="button" onClick={tryClose} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold">Cancel</button>
                  <button type="button" disabled={addable.length === 0 || checking} onClick={() => setStep("confirm")} className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 px-5 py-2.5 text-sm font-semibold text-zinc-900">Review {addable.length} booking{addable.length === 1 ? "" : "s"}</button>
                </>
              )}
              {step === "confirm" && (
                <>
                  <button type="button" disabled={saving} onClick={() => setStep("review")} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold">Go back</button>
                  <button type="button" disabled={saving || addable.length === 0} onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Yes, add {addable.length} booking{addable.length === 1 ? "" : "s"}</button>
                </>
              )}
              {step === "done" && <button type="button" onClick={() => { const n = result?.added ?? 0; close(); if (n > 0) onDone(); }} className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-semibold text-zinc-900">Done</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
