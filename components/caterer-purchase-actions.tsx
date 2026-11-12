"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Wallet, X } from "lucide-react";
import { useUndoable } from "@/components/undo-toast";
import { rs } from "@/lib/caterer-orders";
import { useCanWrite } from "@/components/access-context";
import { WriteOnly } from "@/components/access-context";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const METHOD: Record<string, string> = { CASH: "Cash", UPI: "UPI", CARD: "Card", BANK: "Bank" };

// "Pay supplier" for a purchase that still has a balance; used in the list and on the purchase page.
export function PayButton({ purchaseId, duePaise, label = "Pay" }: { purchaseId: string; duePaise: number; label?: string }) {
  const canWrite = useCanWrite("purchases");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(duePaise / 100));
  const [method, setMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/caterer/purchases/${purchaseId}/pay`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), method }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setOpen(false); router.refresh();
    } finally { setBusy(false); }
  }

  if (!canWrite) return null;
  return (
    <>
      <button type="button" onClick={() => { setAmount(String(duePaise / 100)); setError(""); setOpen(true); }} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-white">
        <Wallet className="h-3 w-3" /> {label}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Pay supplier</h3><button onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-zinc-500 dark:text-zinc-400" /></button></div>
            <p className="text-xs text-zinc-500">Still due: {rs(duePaise)}. You can pay part of it.</p>
            <input className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Amount" />
            <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option>
            </select>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="button" onClick={pay} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm payment
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function PurchasePayments({ purchaseId, totalPaise, paidPaise, payments }: {
  purchaseId: string; totalPaise: number; paidPaise: number; payments: { id: string; amountPaise: number; method: string; note: string | null; paidOn: string; recordedBy?: string | null }[];
}) {
  const router = useRouter();
  const { undoable } = useUndoable();
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const due = totalPaise - paidPaise;

  // taken back at once; Undo records the same payment again
  function undo(p: { id: string; amountPaise: number; method: string; note: string | null; paidOn: string }) {
    undoable(`Payment of ${rs(p.amountPaise)} taken back`, {
      request: { url: `/api/caterer/purchases/${purchaseId}/payments/${p.id}`, method: "DELETE" },
      restore: { url: `/api/caterer/purchases/${purchaseId}/pay`, method: "POST", body: { amount: p.amountPaise / 100, method: p.method, note: p.note ?? undefined, paidOn: p.paidOn.slice(0, 10) } },
    });
  }
  function remove() {
    const here = window.location.pathname;
    undoable("Purchase deleted", {
      request: { url: `/api/caterer/purchases/${purchaseId}`, method: "DELETE" },
      onStart: () => setDeleting(true), onUndo: () => setDeleting(false),
      onDone: () => { if (window.location.pathname === here) router.push("/caterer/purchases"); },
    });
  }

  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm">
          <span className="text-zinc-500">Total </span><span className="font-semibold">{rs(totalPaise)}</span>
          <span className="mx-2 text-zinc-300">·</span><span className="text-zinc-500">Paid </span><span className="font-semibold text-emerald-600">{rs(paidPaise)}</span>
          <span className="mx-2 text-zinc-300">·</span><span className="text-zinc-500">Due </span><span className={due > 0 ? "font-semibold text-red-600" : "font-semibold text-zinc-500 dark:text-zinc-400"}>{due > 0 ? rs(due) : "Nil"}</span>
        </div>
        {due > 0 && <PayButton purchaseId={purchaseId} duePaise={due} label="Pay supplier" />}
      </div>
      {payments.length > 0 && (
        <div className="space-y-1">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <span>{new Date(p.paidOn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · {METHOD[p.method] ?? p.method}{p.note ? ` · ${p.note}` : ""}{p.recordedBy ? ` · by ${p.recordedBy}` : ""}</span>
              <span className="flex items-center gap-2"><span className="font-medium text-zinc-900 dark:text-zinc-50">{rs(p.amountPaise)}</span>
                <WriteOnly page="purchases"><button type="button" disabled={busy} onClick={() => undo(p)} title="Undo this payment" className="p-1.5 -m-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button></WriteOnly></span>
            </div>
          ))}
        </div>
      )}
      <div className="pt-1">
        <WriteOnly page="purchases"><button type="button" onClick={remove} disabled={deleting} className="inline-flex items-center gap-1 rounded-lg px-1 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /> {deleting ? "Deleting…" : "Delete purchase"}</button></WriteOnly>
      </div>
    </section>
  );
}
