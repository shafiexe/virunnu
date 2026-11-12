"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Receipt, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WriteOnly } from "@/components/access-context";
import { METHOD_LABEL, PAY_METHODS } from "@/lib/booking-ledger";

export type PaymentRow = { id: string; amountPaise: number; method: string; paidOn: string; note: string | null; recordedBy: string | null; receiptNo: string };

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;
const day = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const FIELD = "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

// What was received on this booking, one line per payment, with a button to record the next one.
export function BookingPayments({ bookingId, payments, netPaise, closed, canRemove }: { bookingId: string; payments: PaymentRow[]; netPaise: number; closed: boolean; canRemove: boolean }) {
  const router = useRouter();
  const paid = payments.reduce((s, p) => s + p.amountPaise, 0);
  const balance = Math.max(0, netPaise - paid);
  const today = new Date().toLocaleDateString("en-CA");

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<string>("CASH");
  const [paidOn, setPaidOn] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  function start() { setAmount(String(Math.round(balance / 100))); setMethod("CASH"); setPaidOn(today); setNote(""); setError(""); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const n = Number(amount);
    if (!n || n <= 0) { setError("Enter the amount received."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountRupees: n, method, paidOn, note: note || undefined }) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error ?? "Could not save the payment."); return; }
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/owner/bookings/${bookingId}/payments/${id}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Could not remove it."); return; }
      setRemoving(null);
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-zinc-50 dark:bg-zinc-800/60 px-2 py-3"><p className="text-[11px] text-zinc-500">Total</p><p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">{rs(netPaise)}</p></div>
        <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 px-2 py-3"><p className="text-[11px] text-emerald-700 dark:text-emerald-400">Received</p><p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">{rs(paid)}</p></div>
        <div className={cn("rounded-xl px-2 py-3", balance > 0 ? "bg-red-50 dark:bg-red-950/20" : "bg-zinc-50 dark:bg-zinc-800/60")}>
          <p className={cn("text-[11px]", balance > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500")}>Balance due</p>
          <p className={cn("text-sm font-bold", balance > 0 ? "text-red-600 dark:text-red-400" : "text-zinc-500")}>{balance > 0 ? rs(balance) : "Nil"}</p>
        </div>
      </div>

      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-5 text-center text-sm text-zinc-500">No payment received yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 rounded-xl border border-zinc-100 dark:border-zinc-800">
          {payments.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{rs(p.amountPaise)} <span className="font-normal text-zinc-500">· {METHOD_LABEL[p.method] ?? p.method}</span></p>
                <p className="truncate text-xs text-zinc-500">{day(p.paidOn)}{p.recordedBy ? ` · by ${p.recordedBy}` : ""}{p.note ? ` · ${p.note}` : ""}</p>
              </div>
              <Link href={`/owner/bookings/${bookingId}/receipt/${p.id}`} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2.5 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Receipt className="h-3.5 w-3.5" /> Receipt</Link>
              {canRemove && (
                <WriteOnly page="bookings">
                  {removing === p.id ? (
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <button type="button" disabled={busy} onClick={() => remove(p.id)} className="rounded-lg bg-red-500 px-2.5 py-1.5 font-semibold text-white disabled:opacity-60">Remove</button>
                      <button type="button" onClick={() => setRemoving(null)} className="text-zinc-500">Keep</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setRemoving(p.id)} aria-label="Remove this payment" className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-red-500"><X className="h-4 w-4" /></button>
                  )}
                </WriteOnly>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && !open && <p className="text-sm text-red-500">{error}</p>}

      {!closed && balance > 0 && (
        <WriteOnly page="bookings">
          {!open ? (
            <button type="button" onClick={start} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Record payment</button>
          ) : (
            <form onSubmit={save} className="space-y-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Amount received (₹)</span>
                  <input className={FIELD} inputMode="decimal" value={amount} autoFocus onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} /></label>
                <label className="space-y-1"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Date received</span>
                  <input className={FIELD} type="date" value={paidOn} max={today} onChange={(e) => setPaidOn(e.target.value)} /></label>
              </div>
              {balance > 0 && <button type="button" onClick={() => setAmount(String(Math.round(balance / 100)))} className="text-xs font-semibold text-amber-700 dark:text-amber-400 hover:underline">Full balance ({rs(balance)})</button>}
              <div className="space-y-1.5"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">How was it paid?</span>
                <div className="flex flex-wrap gap-1.5">
                  {PAY_METHODS.map((m) => (
                    <button key={m} type="button" onClick={() => setMethod(m)} aria-pressed={method === m}
                      className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium", method === m ? "border-amber-500 bg-white dark:bg-zinc-900 text-amber-800 dark:text-amber-300" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300")}>{METHOD_LABEL[m]}</button>
                  ))}
                </div>
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Note (optional)</span>
                <input className={FIELD} value={note} maxLength={200} placeholder="e.g. UPI ref 4821, paid by his brother" onChange={(e) => setNote(e.target.value)} /></label>
              {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-5 py-2.5 text-sm font-semibold text-white">{busy ? "Saving…" : "Save payment"}</button>
                <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-400">Cancel</button>
              </div>
            </form>
          )}
        </WriteOnly>
      )}
    </div>
  );
}
