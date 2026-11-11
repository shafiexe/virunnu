"use client";

import { useUndoable } from "@/components/undo-toast";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, Trash2, Wallet, X } from "lucide-react";
import { KIND_NAME, PAY_KINDS, PAY_LABEL, ROLES, type PayKind, type PayTypeKey } from "@/lib/caterer-staff";
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

export type StaffFormValue = { id?: string; name: string; phone: string | null; role: string; payType: PayTypeKey; ratePaise: number };

function StaffForm({ initial, onDone, roles }: { initial?: StaffFormValue; onDone: () => void; roles: string[] }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [role, setRole] = useState(initial?.role ?? "Cook");
  const [customRoles, setCustomRoles] = useState<string[]>([]);
  const [addingRole, setAddingRole] = useState(false);
  const [roleText, setRoleText] = useState("");
  // the usual roles, any role already used on the team, and the one being edited
  const allRoles = [...new Set([...ROLES, ...roles, ...(initial?.role ? [initial.role] : []), ...customRoles])];
  function addRole() {
    const r = roleText.trim().slice(0, 40);
    if (!r) return;
    const existing = allRoles.find((x) => x.toLowerCase() === r.toLowerCase());
    if (!existing) setCustomRoles((c) => [...c, r]);
    setRole(existing ?? r);
    setRoleText(""); setAddingRole(false);
  }
  const [payType, setPayType] = useState<PayTypeKey>(initial?.payType ?? "MONTHLY");
  const [rate, setRate] = useState(initial ? String(initial.ratePaise / 100) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    try {
      const res = await fetch(initial?.id ? `/api/caterer/staff/${initial.id}` : "/api/caterer/staff", {
        method: initial?.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role, payType, rate: Number(rate) || 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      onDone(); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <input className={INPUT} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={100} />
      <input className={INPUT} inputMode="tel" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
      <div>
        <div className="mb-1.5 text-xs font-medium text-zinc-500">Role</div>
        <div className="flex flex-wrap gap-1.5">
          {allRoles.map((r) => (
            <button key={r} type="button" onClick={() => setRole(r)} className={cn("px-3 py-1 rounded-full border text-xs font-medium", role === r ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{r}</button>
          ))}
          <button type="button" onClick={() => setAddingRole((v) => !v)} className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-amber-400 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"><Plus className="h-3 w-3" /> New role</button>
        </div>
        {addingRole && (
          <div className="mt-2 flex gap-2">
            <input className={INPUT} placeholder="e.g. Cashier, Cleaner, Tea master" value={roleText} onChange={(e) => setRoleText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRole(); } }} autoFocus maxLength={40} />
            <button type="button" onClick={addRole} className="shrink-0 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-white">Add</button>
          </div>
        )}
      </div>
      <div>
        <div className="mb-1.5 text-xs font-medium text-zinc-500">How are they paid?</div>
        <div className="grid grid-cols-2 gap-1.5">
          {(["MONTHLY", "DAILY"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setPayType(t)} className={cn("rounded-lg border px-2 py-2 text-sm font-semibold", payType === t ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{PAY_LABEL[t]}</button>
          ))}
        </div>
      </div>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
        <input className={cn(INPUT, "pl-6")} inputMode="decimal" placeholder={payType === "MONTHLY" ? "Salary per month" : "Wage per day"} value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
      </div>
      {payType === "DAILY" && <p className="text-xs text-zinc-500">Good for someone who comes now and then too: you pay them only for the days they work.</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}{initial?.id ? "Save" : "Add to team"}
      </button>
    </div>
  );
}

export function AddStaffButton({ roles = [] }: { roles?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Add staff</button>
      {open && <Modal title="New team member" onClose={() => setOpen(false)}><StaffForm roles={roles} onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}

export function EditStaffButton({ staff, roles = [] }: { staff: StaffFormValue; roles?: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"><Pencil className="h-4 w-4" /> Edit</button>
      {open && <Modal title="Edit team member" onClose={() => setOpen(false)}><StaffForm initial={staff} roles={roles} onDone={() => setOpen(false)} /></Modal>}
    </>
  );
}

// Salary, daily wages, an advance or a bonus: one small form, recorded with its date.
export function PayStaffButton({ id, name, payType, toPayPaise, compact }: { id: string; name: string; payType: PayTypeKey; toPayPaise: number; compact?: boolean }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<PayKind>(payType === "DAILY" ? "WAGE" : "SALARY");
  const [amount, setAmount] = useState(toPayPaise > 0 ? String(toPayPaise / 100) : "");
  const [method, setMethod] = useState("CASH");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/caterer/staff/${id}/payments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), kind, method, date, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setOpen(false); router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <>
      <button type="button" onClick={() => { setAmount(toPayPaise > 0 ? String(toPayPaise / 100) : ""); setKind(payType === "DAILY" ? "WAGE" : "SALARY"); setError(""); setOpen(true); }}
        className={cn("inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 font-semibold text-white", compact ? "rounded-lg px-2.5 py-1 text-xs" : "rounded-xl px-4 py-2.5 text-sm")}>
        <Wallet className={compact ? "h-3 w-3" : "h-4 w-4"} /> Pay
      </button>
      {open && (
        <Modal title={`Pay ${name}`} onClose={() => setOpen(false)}>
          <div className="flex flex-wrap gap-1.5">
            {PAY_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("px-3 py-1 rounded-full border text-xs font-medium", kind === k ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{KIND_NAME[k]}</button>
            ))}
          </div>
          {toPayPaise > 0 && <p className="text-xs text-zinc-500">Still to pay this month: {rs(toPayPaise)}</p>}
          <input className={INPUT} inputMode="decimal" placeholder="Amount ₹" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank</option>
            </select>
          </div>
          <input className={INPUT} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" onClick={pay} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Record payment
          </button>
        </Modal>
      )}
    </>
  );
}

async function mark(id: string, date: string, units: number) {
  return fetch(`/api/caterer/staff/${id}/attendance`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ date, units }) });
}

// One tap for today: Present, Half day or Absent.
export function QuickAttendance({ id, date, units: initial }: { id: string; date: string; units: number | null }) {
  const router = useRouter();
  const [units, setUnits] = useState<number | null>(initial);
  const [busy, setBusy] = useState(false);
  const opts: { label: string; value: number }[] = [{ label: "Present", value: 1 }, { label: "Half", value: 0.5 }, { label: "Absent", value: 0 }];

  async function set(v: number) {
    setBusy(true);
    const res = await mark(id, date, v);
    setBusy(false);
    if (res.ok) { setUnits(v === 0 ? null : v); router.refresh(); }
  }
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 dark:bg-zinc-800 p-0.5">
      {opts.map((o) => {
        const on = o.value === 0 ? units === null : units === o.value;
        return (
          <button key={o.label} type="button" disabled={busy} onClick={() => set(o.value)}
            className={cn("px-2.5 py-1 rounded-md text-xs font-semibold transition-colors", on ? (o.value === 0 ? "bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-200 shadow-sm" : "bg-emerald-500 text-white shadow-sm") : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}>
            {on && o.value !== 0 && <Check className="mr-0.5 inline h-3 w-3" />}{o.label}
          </button>
        );
      })}
    </div>
  );
}

// The month at a glance: tap a day to cycle empty → full day → half day → empty.
export function AttendanceGrid({ id, month, marks, today }: { id: string; month: string; marks: Record<string, number>; today: string }) {
  const router = useRouter();
  const [state, setState] = useState(marks);
  const [y, m] = month.split("-").map(Number);
  const first = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];

  async function tap(date: string) {
    const cur = state[date] ?? 0;
    const next = cur === 0 ? 1 : cur === 1 ? 0.5 : 0;
    setState((s) => { const n = { ...s }; if (next === 0) delete n[date]; else n[date] = next; return n; });
    const res = await mark(id, date, next);
    if (!res.ok) setState(marks); else router.refresh();
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-zinc-400 mb-1">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <div key={d}>{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => d === null ? <div key={i} /> : (
          <button key={d} type="button" onClick={() => tap(d)} title="Tap to mark present, half day or clear"
            className={cn("aspect-square rounded-lg border text-sm font-medium transition-colors",
              state[d] === 1 ? "bg-emerald-500 border-emerald-500 text-white" : state[d] === 0.5 ? "bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300",
              d === today && state[d] === undefined && "ring-2 ring-amber-400")}>
            {Number(d.slice(8))}{state[d] === 0.5 && <span className="block text-[9px] leading-none">½</span>}
          </button>
        ))}
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-500"><span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500 mr-1" />Full day</span><span><span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 mr-1" />Half day</span></div>
    </div>
  );
}

export type StaffPaymentRow = { id: string; amountPaise: number; kind: string; method: string; note: string | null; date: string };

// Fix or take back a payment that was recorded by mistake.
export function PaymentActions({ payment, employeeId }: { payment: StaffPaymentRow; employeeId: string }) {
  const router = useRouter();
  const { undoable } = useUndoable();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [kind, setKind] = useState<PayKind>((payment.kind as PayKind) ?? "SALARY");
  const [amount, setAmount] = useState(String(payment.amountPaise / 100));
  const [method, setMethod] = useState(payment.method);
  const [date, setDate] = useState(payment.date.slice(0, 10));
  const [note, setNote] = useState(payment.note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/caterer/staff/payments/${payment.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: Number(amount), kind, method, date, note }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setEditing(false); router.refresh();
    } finally { setBusy(false); }
  }
  // taken back at once; Undo records the same payment again
  function undo() {
    undoable(`${rs(payment.amountPaise)} payment taken back`, {
      request: { url: `/api/caterer/staff/payments/${payment.id}`, method: "DELETE" },
      restore: { url: `/api/caterer/staff/${employeeId}/payments`, method: "POST", body: { amount: payment.amountPaise / 100, kind: payment.kind, method: payment.method, date: payment.date.slice(0, 10), note: payment.note ?? undefined } },
    });
  }

  return (
    <>
      {(
        <span className="inline-flex items-center gap-1.5">
          <button type="button" onClick={() => { setError(""); setEditing(true); }} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-amber-300 hover:text-amber-600"><Pencil className="h-3 w-3" /> Edit</button>
          <button type="button" onClick={undo} className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 dark:border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:border-red-300 hover:text-red-600"><Trash2 className="h-3 w-3" /> Undo</button>
        </span>
      )}
      {editing && (
        <Modal title="Edit payment" onClose={() => setEditing(false)}>
          <div className="flex flex-wrap gap-1.5">
            {PAY_KINDS.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={cn("px-3 py-1 rounded-full border text-xs font-medium", kind === k ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>{KIND_NAME[k]}</button>
            ))}
          </div>
          <input className={INPUT} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} aria-label="Amount" />
          <div className="grid grid-cols-2 gap-2">
            <input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} />
            <select className={INPUT} value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank</option>
            </select>
          </div>
          <input className={INPUT} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button type="button" onClick={save} disabled={busy} className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save changes
          </button>
        </Modal>
      )}
    </>
  );
}
