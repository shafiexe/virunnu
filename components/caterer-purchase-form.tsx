"use client";

import { enterToNext } from "@/hooks/use-enter-next";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { PURCHASE_CATEGORIES } from "@/lib/caterer-purchases";
import { UNITS } from "@/lib/caterer-items";
import { rs } from "@/lib/caterer-orders";
import { cn } from "@/lib/utils";

type Person = { id: string; name: string };
export type SupplierOption = { id: string; name: string; category: string };
type Func = { id: string; label: string };
type Row = { key: string; name: string; unit: string; quantity: string; rate: string };

export type PurchaseInitial = {
  id: string; date: string; supplier: string; supplierId?: string | null; billNo: string | null; category: string; totalPaise: number; paidPaise: number;
  employeeId: string | null; orderId: string | null; notes: string | null;
  lines: { name: string; unit: string; quantity: number; ratePaise: number }[];
};

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? 0 : Number(v));

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

export function CatererPurchaseForm({ people: initialPeople, functions, suppliers: initialSuppliers, initial }: {
  people: Person[]; functions: Func[]; suppliers: SupplierOption[]; initial?: PurchaseInitial;
}) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [people, setPeople] = useState(initialPeople);
  const [date, setDate] = useState(initial?.date ?? today);
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [supplierId, setSupplierId] = useState(initial?.supplierId ?? initialSuppliers.find((s) => s.name.toLowerCase() === (initial?.supplier ?? "").toLowerCase())?.id ?? "");
  const [newSupplier, setNewSupplier] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [billNo, setBillNo] = useState(initial?.billNo ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Raw material");
  const [employeeId, setEmployeeId] = useState(initial?.employeeId ?? "");
  const [orderId, setOrderId] = useState(initial?.orderId ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [rows, setRows] = useState<Row[]>(initial?.lines.map((l, i) => ({ key: `r${i}`, name: l.name, unit: l.unit, quantity: String(l.quantity), rate: String(l.ratePaise / 100) })) ?? []);
  const [justTotal, setJustTotal] = useState(initial ? initial.lines.length === 0 : false);
  const [total, setTotal] = useState(initial && initial.lines.length === 0 ? String(initial.totalPaise / 100) : "");
  const [paid, setPaid] = useState("");
  const [method, setMethod] = useState("CASH");
  const [newPerson, setNewPerson] = useState("");
  const [addingPerson, setAddingPerson] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const itemsTotal = rows.reduce((s, r) => s + num(r.quantity) * num(r.rate), 0);
  const grand = justTotal || rows.length === 0 ? num(total) : itemsTotal;
  const paidNum = num(paid);
  const patchRow = (key: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const addRow = () => setRows((r) => [...r, { key: `r${Date.now()}${r.length}`, name: "", unit: "kg", quantity: "", rate: "" }]);

  async function addSupplier() {
    const name = newSupplier.trim();
    if (!name) return;
    const res = await fetch("/api/caterer/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, category }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setSuppliers((x) => [...x, { id: data.supplier.id, name: data.supplier.name, category: data.supplier.category }]); setSupplierId(data.supplier.id); setNewSupplier(""); setAddingSupplier(false); }
    else setError(data.error ?? "Could not add the supplier");
  }

  async function addPerson() {
    const name = newPerson.trim();
    if (!name) return;
    const res = await fetch("/api/owner/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, role: "Kitchen team" }) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) { setPeople((p) => [...p, { id: data.employee.id, name: data.employee.name }]); setEmployeeId(data.employee.id); setNewPerson(""); setAddingPerson(false); }
  }

  async function submit() {
    setError("");
    const supplierName = suppliers.find((s) => s.id === supplierId)?.name ?? "";
    if (!supplierName) return setError("Choose the supplier, or add a new one");
    const useLines = !justTotal && rows.length > 0;
    if (useLines && rows.some((r) => !r.name.trim() || num(r.quantity) <= 0)) return setError("Every item needs a name and a quantity");
    if (grand <= 0) return setError(useLines ? "Add the items with their rates" : "Enter the total amount");
    if (!initial && paidNum > grand) return setError("Paid can't be more than the bill total");

    const body = {
      date, supplier: supplierName, supplierId, billNo, category, employeeId, orderId, notes,
      lines: useLines ? rows.map((r) => ({ name: r.name.trim(), unit: r.unit, quantity: num(r.quantity), rate: num(r.rate) })) : [],
      ...(useLines ? {} : { total: num(total) }),
      ...(!initial ? { paid: paidNum, method } : {}),
    };
    setSaving(true);
    try {
      const res = await fetch(initial ? `/api/caterer/purchases/${initial.id}` : "/api/caterer/purchases", {
        method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      router.push("/caterer/purchases");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-28" onKeyDown={enterToNext(() => { if (!saving) submit(); })}>
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Purchase details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date" required><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Supplier" required>
            <div className="flex gap-2">
              <select className={INPUT} value={supplierId} onChange={(e) => { setSupplierId(e.target.value); const sup = suppliers.find((x) => x.id === e.target.value); if (sup && (PURCHASE_CATEGORIES as readonly string[]).includes(sup.category)) setCategory(sup.category); }}>
                <option value="">Choose a supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.category}</option>)}
              </select>
              <button type="button" onClick={() => setAddingSupplier((v) => !v)} className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">+ New</button>
            </div>
            {addingSupplier && (
              <div className="flex gap-2 pt-1">
                <input className={INPUT} placeholder="Supplier name" value={newSupplier} onChange={(e) => setNewSupplier(e.target.value)} autoFocus />
                <button type="button" onClick={addSupplier} className="shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white">Add</button>
              </div>
            )}
          </Field>
          <Field label="Bill number (optional)"><input className={INPUT} value={billNo} onChange={(e) => setBillNo(e.target.value)} /></Field>
          <Field label="Bought by">
            <div className="flex gap-2">
              <select className={INPUT} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="">Not recorded</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="button" onClick={() => setAddingPerson((v) => !v)} className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">+ Person</button>
            </div>
            {addingPerson && (
              <div className="flex gap-2 pt-1">
                <input className={INPUT} placeholder="Name" value={newPerson} onChange={(e) => setNewPerson(e.target.value)} autoFocus />
                <button type="button" onClick={addPerson} className="shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white">Add</button>
              </div>
            )}
          </Field>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PURCHASE_CATEGORIES.map((c) => (
            <button key={c} type="button" onClick={() => setCategory(c)} className={cn("px-3 py-1 rounded-full border text-xs font-medium transition-colors", category === c ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{c}</button>
          ))}
        </div>
        <Field label="For which function? (optional — shows the cost against that function)">
          <select className={INPUT} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
            <option value="">General stock, not for one function</option>
            {functions.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
        </Field>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">What was bought</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={justTotal} onChange={(e) => setJustTotal(e.target.checked)} className="h-4 w-4 accent-amber-500" />
            I only know the total
          </label>
        </div>

        {justTotal ? (
          <Field label="Total amount (₹)" required><input className={INPUT} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value.replace(/[^\d.]/g, ""))} placeholder="e.g. 4500" /></Field>
        ) : (
          <>
            {rows.length === 0 && <p className="text-xs text-zinc-400">Add each item with quantity and rate, or tick “I only know the total”.</p>}
            {rows.map((r) => (
              <div key={r.key} className="grid grid-cols-[1fr_4.5rem_4.5rem_5rem_auto] items-center gap-2">
                <input className={INPUT} placeholder="Item, e.g. Onion" value={r.name} onChange={(e) => patchRow(r.key, { name: e.target.value })} />
                <input className={INPUT} inputMode="decimal" placeholder="Qty" value={r.quantity} onChange={(e) => patchRow(r.key, { quantity: e.target.value.replace(/[^\d.]/g, "") })} />
                <select className={INPUT} value={r.unit} onChange={(e) => patchRow(r.key, { unit: e.target.value })}>{[...new Set([...UNITS, r.unit])].map((u) => <option key={u} value={u}>{u}</option>)}</select>
                <input className={INPUT} inputMode="decimal" placeholder="Rate ₹" value={r.rate} onChange={(e) => patchRow(r.key, { rate: e.target.value.replace(/[^\d.]/g, "") })} />
                <button type="button" onClick={() => setRows((x) => x.filter((y) => y.key !== r.key))} aria-label="Remove" className="p-1.5 text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <button type="button" onClick={addRow} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline"><Plus className="h-4 w-4" /> Add item</button>
          </>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-3">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Payment</h2>
        {initial ? (
          <p className="text-sm text-zinc-500">Paid so far {rs(initial.paidPaise)}. Add or undo payments from the purchase list.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Paid now (₹) — leave empty if on credit"><input className={INPUT} inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" /></Field>
            <Field label="Paid by">
              <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option>
              </select>
            </Field>
          </div>
        )}
        <Field label="Notes"><textarea className={cn(INPUT, "resize-none")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </section>

      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-52 z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[10rem]">
            <div className="text-xs text-zinc-500">Bill total</div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(Math.round(grand * 100))}{!initial && grand > 0 && paidNum < grand && <span className="ml-2 text-xs font-medium text-red-500">Due {rs(Math.round((grand - paidNum) * 100))}</span>}</div>
          </div>
          {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
          <button type="button" onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{initial ? "Save changes" : "Save purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}
