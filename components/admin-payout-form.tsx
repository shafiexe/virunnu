"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELD = "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500";

// Where a venue's money goes, and a form to record that a payout was made.
export function AdminPayoutForm({ orgId, owedRupees, details }: { orgId: string; owedRupees: number; details: string }) {
  const router = useRouter();
  const [where, setWhere] = useState(details);
  const [amount, setAmount] = useState(owedRupees > 0 ? String(owedRupees) : "");
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function call(method: string, body: object) {
    setBusy(true); setMsg("");
    const res = await fetch("/api/admin/payouts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setMsg(d.error ?? "Something went wrong"); return false; }
    router.refresh();
    return true;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor={`where-${orgId}`}>Send money to (UPI id or bank details)</label>
        <textarea id={`where-${orgId}`} rows={3} value={where} onChange={(e) => setWhere(e.target.value)} className={FIELD} />
        <button type="button" disabled={busy} onClick={async () => { if (await call("PATCH", { orgId, payoutDetails: where })) setMsg("Saved"); }} className="rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium">Save details</button>
      </div>
      <form className="space-y-1.5" onSubmit={async (e) => {
        e.preventDefault();
        const n = Number(amount);
        if (!(n > 0)) { setMsg("Enter the amount sent"); return; }
        if (await call("POST", { orgId, amountRupees: n, paidOn: new Date().toLocaleDateString("en-CA"), reference })) { setReference(""); setAmount(""); setMsg("Payout recorded"); }
      }}>
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor={`amt-${orgId}`}>Amount sent today (₹)</label>
        <input id={`amt-${orgId}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} className={FIELD} />
        <label className="text-xs font-medium text-zinc-600 dark:text-zinc-400" htmlFor={`ref-${orgId}`}>Bank or UPI reference</label>
        <input id={`ref-${orgId}`} value={reference} onChange={(e) => setReference(e.target.value)} className={FIELD} />
        <button type="submit" disabled={busy} className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-60 px-3 py-1.5 text-xs font-semibold text-zinc-900">Record payout</button>
      </form>
      {msg && <p role="status" className="sm:col-span-2 text-xs text-zinc-600 dark:text-zinc-400">{msg}</p>}
    </div>
  );
}
