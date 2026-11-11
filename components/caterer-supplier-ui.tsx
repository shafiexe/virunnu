"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Wallet, X } from "lucide-react";
import { CYCLES, CYCLE_LABEL, SUPPLIER_CATEGORIES, type SupplierCycleKey } from "@/lib/caterer-suppliers";
import { rs } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h3><button onClick={onClose} aria-label="Close"><X className="h-4 w-4 text-zinc-400" /></button></div>
        {children}
      </div>
    </div>
  );
}

export type SupplierFormValue = { id?: string; name: string; phone: string | null; category: string; cycle: SupplierCycleKey; notes: string | null };

function SupplierForm({ initial, onDone }: { initial?: SupplierFormValue; onDone: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Vegetables");
  const [cycle, setCycle] = useState<SupplierCycleKey>(initial?.cycle ?? "PER_BILL");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    try {
      const res = await fetch(initial?.id ? `/api/caterer/suppliers/${initial.id}` : "/api/caterer/suppliers", {
        method: initial?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, category, cycle, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      onDone(); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input className={INPUT} placeholder="Supplier name, e.g. Haji's Fish Stall" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} />
      <input className={INPUT} inputMode="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div>
        <div className="mb-1.5 text-xs font-medium text-zinc-500">What do they supply?</div>
        <div className="flex flex-wrap gap-1.5">
          {SUPPLIER_CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={cn("px-3 py-1 rounded-full border text-xs font-medium transition-colors", category === c ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{c}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium text-zinc-500">How do you pay them?</div>
        <div className="grid grid-cols-3 gap-1.5">
          {CYCLES.map((c) => (
            <button key={c} type="button" onClick={() => setCycle(c)} className={cn("rounded-lg border px-2 py-2 text-xs font-semibold transition-colors", cycle === c ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{CYCLE_LABEL[c]}</button>
          ))}
        </div>
      </div>
      <input className={INPUT} placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={300} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{initial?.id ? "Save supplier" : "Add supplier"}
      </button>
    </div>
  );
}

export function AddSupplierButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add supplier</button>
      {open && <Modal title="New supplier" onClose={() => setOpen(false)}><SupplierForm onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}

export function EditSupplierButton({ supplier }: { supplier: SupplierFormValue }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" /> Edit</button>
      {open && <Modal title="Edit supplier" onClose={() => setOpen(false)}><SupplierForm initial={supplier} onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}

// "Settle account": pay what is owed, all or part. It goes against the oldest bills first.
export function SettleButton({ supplierId, name, duePaise, compact }: { supplierId: string; name: string; duePaise: number; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(duePaise / 100));
  const [method, setMethod] = useState("CASH");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/caterer/suppliers/${supplierId}/settle`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), method }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setOpen(false); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setAmount(String(duePaise / 100)); setError(""); setOpen(true); }}
        className={cn("inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-semibold text-white", compact ? "px-2.5 py-1 text-xs rounded-lg" : "px-4 py-2.5 text-sm")}>
        <Wallet className={compact ? "h-3 w-3" : "h-4 w-4"} /> Settle
      </button>
      {open && (
        <Modal title={`Settle account · ${name}`} onClose={() => setOpen(false)}>
          <p className="text-xs text-zinc-500">You owe {rs(duePaise)}. Pay all of it, or part. It goes against the oldest bills first.</p>
          <input className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Amount paid" />
          <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option>
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" onClick={pay} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Confirm payment
          </button>
        </Modal>
      )}
    </>
  );
}
