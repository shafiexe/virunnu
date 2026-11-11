"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Wallet, X } from "lucide-react";
import { BILL_LABEL, rs, type BillTypeKey } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";

export type PayableBill = { id: string; number: number; type: BillTypeKey; balancePaise: number };

const MODES = [["CASH", "Cash"], ["UPI", "UPI"], ["CARD", "Card"], ["BANK", "Bank"]] as const;
const MODE_KEY = "virunnu.payMode";

// "Payment received" from any list: pick the invoice (if there are two), the amount defaults to the full balance,
// and the way of paying is remembered from last time. One tap on Save for the usual case.
export function QuickPay({ bills, customer, onDone, compact = false }: { bills: PayableBill[]; customer: string; onDone?: () => void; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [billId, setBillId] = useState(bills[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const bill = bills.find((b) => b.id === billId) ?? bills[0];
  useEffect(() => { try { const m = localStorage.getItem(MODE_KEY); if (m && MODES.some(([k]) => k === m)) setMode(m); } catch {} }, []);
  if (!bill) return null;

  function show() {
    setBillId(bills[0].id); setAmount(String(bills[0].balancePaise / 100)); setError(""); setOpen(true);
  }
  function choose(id: string) {
    setBillId(id); setAmount(String((bills.find((b) => b.id === id)?.balancePaise ?? 0) / 100));
  }
  async function save() {
    const value = Number(amount);
    if (!(value > 0)) { setError("Enter the amount received"); return; }
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/caterer/bills/${bill.id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: value, method: mode }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      try { localStorage.setItem(MODE_KEY, mode); } catch {}
      setOpen(false); router.refresh(); onDone?.();
    } finally { setBusy(false); }
  }

  const total = bills.reduce((s, b) => s + b.balancePaise, 0);
  return (
    <>
      <button type="button" onClick={show} title={`Payment received from ${customer}`}
        className={cn("inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 transition-colors", compact ? "px-2.5 py-1.5 md:px-2 md:py-0.5 text-xs md:text-[11px]" : "px-2.5 py-1.5 text-xs")}>
        <Wallet className="h-3 w-3" /> Receive
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4 text-left" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); save(); }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Payment received</h3>
                <p className="text-xs text-zinc-500">{customer} · owes {rs(total)}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close"><X className="h-4 w-4 text-zinc-400" /></button>
            </div>

            {bills.length > 1 && (
              <div className="space-y-1.5">
                {bills.map((b) => (
                  <button key={b.id} type="button" onClick={() => choose(b.id)}
                    className={cn("w-full flex items-center justify-between rounded-xl border px-3 py-2 text-sm", b.id === bill.id ? "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20" : "border-zinc-200 dark:border-zinc-700")}>
                    <span>#{b.number} <span className="text-zinc-500">{BILL_LABEL[b.type]}</span></span>
                    <span className="font-semibold">{rs(b.balancePaise)}</span>
                  </button>
                ))}
              </div>
            )}

            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400">₹</span>
                <input autoFocus inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} onFocus={(e) => e.target.select()} aria-label="Amount received"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 pl-7 pr-3 py-2.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500">
                <span>Balance on #{bill.number}: {rs(bill.balancePaise)}</span>
                {Number(amount) * 100 !== bill.balancePaise && <button type="button" onClick={() => setAmount(String(bill.balancePaise / 100))} className="font-medium text-emerald-600 hover:underline">Full balance</button>}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {MODES.map(([k, label]) => (
                <button key={k} type="button" onClick={() => setMode(k)} className={cn("rounded-lg border py-1.5 text-xs font-medium", mode === k ? "border-emerald-500 bg-emerald-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400")}>{label}</button>
              ))}
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save payment
            </button>
          </form>
        </div>
      )}
    </>
  );
}
