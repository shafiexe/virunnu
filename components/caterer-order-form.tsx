"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { computeGst } from "@/lib/caterer-gst";
import { enterToNext } from "@/hooks/use-enter-next";
import { cn } from "@/lib/utils";
import { GROUP_LABEL, ITEM_GROUPS, UNITS, type ItemGroupKey } from "@/lib/caterer-items";
import { SERVE_PRESETS, BILL_LABEL, billTypeOfGroup, formatTime, type BillTypeKey } from "@/lib/caterer-orders";
import type { PriceItem } from "@/components/caterer-items-manager";

type Serving = { label: string; time: string; guests: string };
type Line = {
  key: string; itemId?: string; name: string; group: ItemGroupKey; unit: string;
  quantity: string; rate: string; servingIndex?: number;
};

export type OrderFormInitial = {
  id: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string | null;
  place: string | null;
  eventType: string | null;
  notes: string | null;
  foodDiscountPaise: number;
  foodDiscountReason: string | null;
  serviceDiscountPaise: number;
  serviceDiscountReason: string | null;
  servings: { label: string; time: string; guests: number | null }[];
  team: { employeeId: string; name: string; amountPaise: number }[];
  lines: { itemId: string | null; name: string; group: ItemGroupKey; unit: string; quantity: number; ratePaise: number; servingIndex: number | null }[];
};

const INPUT =
  "w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";
const SMALL = "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-2 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400";

const EVENT_TYPES = ["Wedding", "Reception", "Engagement", "Birthday", "Corporate", "Other"];
const rs = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const num = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? 0 : Number(v));

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 space-y-4">
      <div>
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{title}</h2>
        {hint && <p className="text-xs text-zinc-500 mt-0.5">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-zinc-500">{label}{required && <span className="text-red-500"> *</span>}</span>
      {children}
    </label>
  );
}

export type PersonOption = { id: string; name: string; role: string; payType: "MONTHLY" | "DAILY"; ratePaise: number };

export type GstRates = Record<BillTypeKey, { gstRateBp: number; gstInclusive: boolean }>;

export function CatererOrderForm({ catalog, initial, template, gstRates, quote, defaultDate, prefill, enquiryId, people: initialPeople = [] }: {
  people?: PersonOption[]; catalog: PriceItem[]; initial?: OrderFormInitial; template?: OrderFormInitial; gstRates?: GstRates; quote?: { id?: string; validUntil?: string }; defaultDate?: string; prefill?: { name: string; phone: string; address: string; notes?: string }; enquiryId?: string }) {
  const router = useRouter();
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  // a copy of an earlier order starts with its items, times and team, but not its date, notes or discounts
  const seed = initial ?? template;
  // a quotation has no team and takes no advance, but holds its price until a date
  const showAdvance = !initial && !quote;
  const [validUntil, setValidUntil] = useState(quote?.validUntil ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? today);
  const [customerName, setCustomerName] = useState(seed?.customerName ?? prefill?.name ?? "");
  const [customerPhone, setCustomerPhone] = useState(seed?.customerPhone ?? prefill?.phone ?? "");
  const [place, setPlace] = useState(seed?.place ?? "");
  const [eventType, setEventType] = useState(seed?.eventType ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? prefill?.notes ?? "");
  const [servings, setServings] = useState<Serving[]>(
    seed?.servings.map((s) => ({ label: s.label, time: s.time, guests: s.guests ? String(s.guests) : "" })) ?? []
  );
  const [lines, setLines] = useState<Line[]>(
    seed?.lines.map((l, i) => ({
      key: `l${i}`, itemId: l.itemId ?? undefined, name: l.name, group: l.group, unit: l.unit,
      quantity: String(l.quantity), rate: String(l.ratePaise / 100), servingIndex: l.servingIndex ?? undefined,
    })) ?? []
  );
  const [customerAddress, setCustomerAddress] = useState(seed?.customerAddress ?? prefill?.address ?? "");
  const [known, setKnown] = useState<{ name: string; balancePaise: number; orderCount: number } | null>(null);
  // what this customer was charged before, so ticking an item fills in their usual rate
  const [usual, setUsual] = useState<{ rates: Record<string, number>; last: { id: string; date: string; eventType: string | null; place: string | null } | null } | null>(null);
  const [loadingLast, setLoadingLast] = useState(false);
  // discount, reason and advance are kept separately for the food bill and the service & settings bill
  const [adj, setAdj] = useState<Record<BillTypeKey, { discount: string; reason: string; advance: string }>>({
    FOOD: { discount: initial?.foodDiscountPaise ? String(initial.foodDiscountPaise / 100) : "", reason: initial?.foodDiscountReason ?? "", advance: "" },
    SERVICE: { discount: initial?.serviceDiscountPaise ? String(initial.serviceDiscountPaise / 100) : "", reason: initial?.serviceDiscountReason ?? "", advance: "" },
  });
  const [advanceMethod, setAdvanceMethod] = useState("CASH");
  const patchAdj = (t: BillTypeKey, patch: Partial<{ discount: string; reason: string; advance: string }>) => setAdj((a) => ({ ...a, [t]: { ...a[t], ...patch } }));
  const [custom, setCustom] = useState({ name: "", group: "OTHER" as ItemGroupKey, unit: "nos", rate: "", qty: "1", save: true });
  const [customOpen, setCustomOpen] = useState(false);
  const [people, setPeople] = useState<PersonOption[]>(initialPeople);
  const [team, setTeam] = useState<{ employeeId: string; name: string; amount: string }[]>(
    seed?.team.map((t) => ({ employeeId: t.employeeId, name: t.name, amount: t.amountPaise ? String(t.amountPaise / 100) : "" })) ?? []
  );
  const [pickPerson, setPickPerson] = useState("");
  const [newPerson, setNewPerson] = useState({ name: "", phone: "", wage: "" });
  const [addingPerson, setAddingPerson] = useState(false);
  const [personError, setPersonError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ItemGroupKey>("FOOD");
  const [extraItems, setExtraItems] = useState<PriceItem[]>([]);

  const activeCatalog = useMemo(() => [...catalog.filter((i) => i.active), ...extraItems], [catalog, extraItems]);
  const byItem = new Map(lines.filter((l) => l.itemId).map((l) => [l.itemId!, l]));
  const customLines = lines.filter((l) => !l.itemId);

  const money = (t: BillTypeKey) => {
    const subtotal = lines.filter((l) => billTypeOfGroup(l.group) === t).reduce((s, l) => s + num(l.quantity) * num(l.rate), 0);
    const discount = num(adj[t].discount);
    const g = gstRates?.[t];
    const gst = g && g.gstRateBp > 0 ? computeGst(Math.round(subtotal * 100), Math.round(discount * 100), g) : null;
    const net = Math.max(0, subtotal - discount) + (gst ? gst.taxPaise / 100 : 0);
    const advance = num(adj[t].advance);
    return { subtotal, discount, gst, gstRateBp: g?.gstRateBp ?? 0, gstInclusive: g?.gstInclusive ?? true, net, advance, balance: Math.max(0, net - advance), count: lines.filter((l) => billTypeOfGroup(l.group) === t).length };
  };
  const food = money("FOOD");
  const service = money("SERVICE");
  const grandNet = food.net + service.net;
  const grandAdvance = food.advance + service.advance;

  // Look the customer up by phone so repeat customers are filled in and their balance is visible
  async function lookupCustomer() {
    if (customerPhone.replace(/\D/g, "").length < 10) { setKnown(null); setUsual(null); return; }
    const res = await fetch(`/api/caterer/customers?phone=${encodeURIComponent(customerPhone)}`).then((r) => r.json()).catch(() => null);
    const c = res?.customers?.[0];
    if (c) {
      setKnown({ name: c.name, balancePaise: c.balancePaise, orderCount: c.orderCount });
      if (!customerName.trim()) setCustomerName(c.name);
      if (!customerAddress.trim() && c.address) setCustomerAddress(c.address);
      setUsual(res?.usual ?? null);
    } else { setKnown(null); setUsual(null); }
  }

  // Begin from this customer's latest function: its serve times, items at the rates they paid, and the team
  async function useLastOrder() {
    if (!usual?.last) return;
    setLoadingLast(true);
    try {
      const data = await fetch(`/api/caterer/orders/${usual.last.id}/initial`).then((r) => r.json()).catch(() => null);
      const t = data?.initial as OrderFormInitial | undefined;
      if (!t) return;
      setServings(t.servings.map((s) => ({ label: s.label, time: s.time, guests: s.guests ? String(s.guests) : "" })));
      setLines(t.lines.map((l, i) => ({ key: `l${i}`, itemId: l.itemId ?? undefined, name: l.name, group: l.group, unit: l.unit, quantity: String(l.quantity), rate: String(l.ratePaise / 100), servingIndex: l.servingIndex ?? undefined })));
      if (!quote) setTeam(t.team.map((m) => ({ employeeId: m.employeeId, name: m.name, amount: m.amountPaise ? String(m.amountPaise / 100) : "" })));
      if (!eventType && t.eventType) setEventType(t.eventType);
      if (!place.trim() && t.place) setPlace(t.place);
    } finally { setLoadingLast(false); }
  }

  // ── serve times ──
  const toggleServing = (label: string, time: string) => {
    setServings((list) => {
      const at = list.findIndex((s) => s.label === label);
      if (at >= 0) {
        setLines((ls) => ls.map((l) => (l.servingIndex === at ? { ...l, servingIndex: undefined } : l.servingIndex !== undefined && l.servingIndex > at ? { ...l, servingIndex: l.servingIndex - 1 } : l)));
        return list.filter((_, i) => i !== at);
      }
      return [...list, { label, time, guests: "" }];
    });
  };
  const addCustomServing = () => setServings((list) => (list.length >= 8 ? list : [...list, { label: "Custom time", time: "09:00", guests: "" }]));
  const removeServing = (i: number) => {
    setServings((list) => list.filter((_, j) => j !== i));
    setLines((ls) => ls.map((l) => (l.servingIndex === i ? { ...l, servingIndex: undefined } : l.servingIndex !== undefined && l.servingIndex > i ? { ...l, servingIndex: l.servingIndex - 1 } : l)));
  };
  const patchServing = (i: number, patch: Partial<Serving>) => setServings((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  // ── lines ──
  const toggleItem = (item: PriceItem) => {
    setLines((ls) =>
      ls.some((l) => l.itemId === item.id)
        ? ls.filter((l) => l.itemId !== item.id)
        : [...ls, { key: `i${item.id}`, itemId: item.id, name: item.name, group: item.group, unit: item.unit, quantity: "1", rate: String((usual?.rates[`i:${item.id}`] ?? item.ratePaise) / 100), servingIndex: servings.length === 1 && item.group === "FOOD" ? 0 : undefined }]
    );
  };
  const patchLine = (key: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function addCustom(e: React.FormEvent) {
    e.preventDefault();
    if (!custom.name.trim()) return;
    let itemId: string | undefined;
    if (custom.save) {
      const res = await fetch("/api/caterer/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: custom.name, group: custom.group, unit: custom.unit, rate: num(custom.rate) }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { itemId = data.item.id; setExtraItems((x) => [...x, data.item]); }
    }
    setLines((ls) => [...ls, { key: `c${Date.now()}`, itemId, name: custom.name.trim(), group: custom.group, unit: custom.unit, quantity: custom.qty || "1", rate: custom.rate || "0" }]);
    setTab(custom.group);
    setCustom({ name: "", group: custom.group, unit: "nos", rate: "", qty: "1", save: true });
    setCustomOpen(false);
  }

  // pick someone from the staff list, or add a new daily-wage person on the spot
  function addToTeam(id: string) {
    const p = people.find((x) => x.id === id);
    if (!p || team.some((t) => t.employeeId === id)) return;
    // a daily-wage person comes in at their usual wage; a monthly person is covered by their salary
    setTeam((t) => [...t, { employeeId: p.id, name: p.name, amount: p.payType === "DAILY" && p.ratePaise ? String(p.ratePaise / 100) : "" }]);
    setPickPerson("");
  }
  async function createPerson() {
    setPersonError("");
    if (!newPerson.name.trim()) return setPersonError("Enter a name");
    const res = await fetch("/api/caterer/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newPerson.name, phone: newPerson.phone, role: "Helper", payType: "DAILY", rate: Number(newPerson.wage) || 0 }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setPersonError(data.error ?? "Could not add");
    const p: PersonOption = { id: data.staff.id, name: data.staff.name, role: data.staff.role, payType: "DAILY", ratePaise: data.staff.dailyRatePaise ?? 0 };
    setPeople((x) => [...x, p]);
    setTeam((t) => [...t, { employeeId: p.id, name: p.name, amount: p.ratePaise ? String(p.ratePaise / 100) : "" }]);
    setNewPerson({ name: "", phone: "", wage: "" });
    setAddingPerson(false);
  }
  const teamCost = team.reduce((s, t) => s + num(t.amount), 0);

  async function submit() {
    setError("");
    if (!customerName.trim()) return setError("Enter the customer's name");
    if (customerPhone.replace(/\D/g, "").length < 10) return setError("Enter a valid phone number");
    if (lines.some((l) => num(l.quantity) <= 0)) return setError("Every ticked item needs a quantity");
    for (const [t, m] of [["FOOD", food], ["SERVICE", service]] as const) {
      if (m.discount > m.subtotal) return setError(`${BILL_LABEL[t]}: discount can't be more than the total`);
      if (m.advance > m.net) return setError(`${BILL_LABEL[t]}: advance can't be more than the bill`);
    }

    const body = {
      date, customerName: customerName.trim(), customerPhone: customerPhone.trim(), customerAddress,
      place, eventType, notes,
      servings: servings.map((s) => ({ label: s.label.trim() || "Serving", time: s.time, ...(num(s.guests) > 0 ? { guests: Math.round(num(s.guests)) } : {}) })),
      lines: lines.map((l) => ({
        ...(l.itemId ? { itemId: l.itemId } : {}), name: l.name, group: l.group, unit: l.unit,
        quantity: num(l.quantity), rate: num(l.rate), ...(l.servingIndex !== undefined ? { servingIndex: l.servingIndex } : {}),
      })),
      ...(quote ? { validUntil } : { team: team.map((t) => ({ employeeId: t.employeeId, amount: num(t.amount) })) }),
      foodBill: { discount: food.discount, discountReason: adj.FOOD.reason, ...(showAdvance && food.advance > 0 ? { advance: food.advance } : {}) },
      serviceBill: { discount: service.discount, discountReason: adj.SERVICE.reason, ...(showAdvance && service.advance > 0 ? { advance: service.advance } : {}) },
      ...(showAdvance && grandAdvance > 0 ? { advanceMethod } : {}),
      ...(!initial && enquiryId ? { enquiryId } : {}),
    };

    setSaving(true);
    try {
      const url = quote ? (quote.id ? `/api/caterer/quotes/${quote.id}` : "/api/caterer/quotes") : initial ? `/api/caterer/orders/${initial.id}` : "/api/caterer/orders";
      const res = await fetch(url, {
        method: quote ? (quote.id ? "PATCH" : "POST") : initial ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? (quote ? "Could not save the quotation" : "Could not save the order")); return; }
      router.push(quote ? `/caterer/quotes/${data.quote.id}` : `/caterer/orders/${data.order.id}`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 pb-28" onKeyDown={enterToNext(() => { if (!saving) submit(); })}>
      {/* 1. who & when */}
      <Card title="1 · Who and when">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date" required><input type="date" className={INPUT} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Phone" required><input className={INPUT} inputMode="tel" autoFocus={!initial && !template && !prefill} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} onBlur={lookupCustomer} placeholder="98470 00000" /></Field>
          <Field label="Customer name" required><input className={INPUT} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Shafi" /></Field>
          <Field label="Customer address"><input className={INPUT} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="optional" /></Field>
          {quote && <Field label="Price valid until"><input type="date" className={INPUT} value={validUntil} min={today} onChange={(e) => setValidUntil(e.target.value)} /></Field>}
          <Field label="Place / venue"><input className={INPUT} value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Rozia Convention Centre, Kondotty" /></Field>
        </div>
        {known && (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
            Existing customer <span className="font-semibold">{known.name}</span> · {known.orderCount} earlier function{known.orderCount === 1 ? "" : "s"}
            {known.balancePaise > 0 ? <span className="ml-1 font-semibold text-red-600 dark:text-red-400">· ₹{(known.balancePaise / 100).toLocaleString("en-IN")} still due</span> : <span> · nothing due</span>}
          </div>
        )}
        {usual?.last && lines.length === 0 && !initial && (
          <button type="button" onClick={useLastOrder} disabled={loadingLast}
            className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 px-3 py-2.5 text-left text-sm text-amber-900 dark:text-amber-200 hover:bg-amber-100 disabled:opacity-60">
            <span>Start from {known?.name ?? "their"} last function ({usual.last.eventType ?? "Function"}{usual.last.place ? `, ${usual.last.place}` : ""}, {new Date(usual.last.date + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })})</span>
            <span className="font-semibold shrink-0">{loadingLast ? "Loading…" : "Use it →"}</span>
          </button>
        )}
        <div className="flex flex-wrap gap-1.5">
          {EVENT_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => setEventType(eventType === t ? "" : t)}
              className={cn("px-3 py-1 rounded-full border text-xs font-medium transition-colors", eventType === t ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>
              {t}
            </button>
          ))}
        </div>
      </Card>

      {/* 2. serve times */}
      <Card title="2 · Serve times" hint="When does the food need to be ready? Add one or more.">
        <div className="flex flex-wrap gap-1.5">
          {SERVE_PRESETS.map((p) => {
            const on = servings.some((s) => s.label === p.label);
            return (
              <button key={p.label} type="button" onClick={() => toggleServing(p.label, p.time)}
                className={cn("px-3 py-1.5 rounded-full border text-xs font-medium transition-colors", on ? "bg-amber-500 border-amber-500 text-white" : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:border-amber-300")}>
                {p.label}
              </button>
            );
          })}
          <button type="button" onClick={addCustomServing} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-amber-400 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30">
            <Plus className="h-3 w-3" /> Other time
          </button>
        </div>
        {servings.map((s, i) => (
          <div key={i} className="grid grid-cols-[1fr_7.5rem_6rem_auto] items-end gap-2">
            <Field label={i === 0 ? "Name" : " "}><input className={INPUT} value={s.label} onChange={(e) => patchServing(i, { label: e.target.value })} /></Field>
            <Field label={i === 0 ? "Time" : " "}><input type="time" className={INPUT} value={s.time} onChange={(e) => patchServing(i, { time: e.target.value })} /></Field>
            <Field label={i === 0 ? "Guests" : " "}><input className={INPUT} inputMode="numeric" value={s.guests} onChange={(e) => patchServing(i, { guests: e.target.value.replace(/\D/g, "") })} placeholder="—" /></Field>
            <button type="button" onClick={() => removeServing(i)} aria-label="Remove time" className="p-2 text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
          </div>
        ))}
        {servings.length === 0 && <p className="text-xs text-zinc-400">Optional. You can skip this for orders that are only equipment or staff.</p>}
      </Card>

      {/* 3. items */}
      <Card title="3 · Items" hint="Tick what the customer needs, then set the quantity. The rate comes from your price list and can be changed here.">
        <div className="flex gap-1 overflow-x-auto -mx-1 px-1">
          {ITEM_GROUPS.map((g) => {
            const count = lines.filter((l) => l.group === g).length;
            return (
              <button key={g} type="button" onClick={() => setTab(g)}
                className={cn("px-3.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors", tab === g ? "bg-amber-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700")}>
                {GROUP_LABEL[g]}{count > 0 && <span className={cn("ml-1.5 text-xs", tab === g ? "text-amber-100" : "text-amber-600")}>{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="space-y-1.5">
          {activeCatalog.filter((i) => i.group === tab).map((item) => {
            const line = byItem.get(item.id);
            return (
              <div key={item.id} className={cn("rounded-xl border px-3 py-2 transition-colors", line ? "border-amber-400 bg-amber-50/60 dark:bg-amber-950/10" : "border-zinc-200 dark:border-zinc-700")}>
                <div className="flex items-center gap-3">
                  <label className="flex flex-1 items-center gap-2.5 cursor-pointer min-w-0">
                    <input type="checkbox" checked={!!line} onChange={() => toggleItem(item)} className="h-4 w-4 accent-amber-500 shrink-0" />
                    <span className="text-sm truncate">{item.name}</span>
                    {(() => { const u = usual?.rates[`i:${item.id}`]; return u !== undefined && u !== item.ratePaise
                      ? <span className="text-xs shrink-0 text-amber-600 dark:text-amber-400" title={`Usual rate for ${known?.name ?? "this customer"}`}>{rs(u / 100)}/{item.unit} · usual</span>
                      : <span className="text-xs text-zinc-400 shrink-0">{rs(item.ratePaise / 100)}/{item.unit}</span>; })()}
                  </label>
                  {line && (
                    <span className="hidden sm:block text-sm font-medium text-zinc-700 dark:text-zinc-200 shrink-0">{rs(num(line.quantity) * num(line.rate))}</span>
                  )}
                </div>
                {line && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 pl-7">
                    <label className="flex items-center gap-1 text-xs text-zinc-500">Qty
                      <input className={cn(SMALL, "w-20")} inputMode="decimal" value={line.quantity} onChange={(e) => patchLine(line.key, { quantity: e.target.value.replace(/[^\d.]/g, "") })} />
                      <span>{line.unit}</span>
                    </label>
                    <label className="flex items-center gap-1 text-xs text-zinc-500">Rate ₹
                      <input className={cn(SMALL, "w-24")} inputMode="decimal" value={line.rate} onChange={(e) => patchLine(line.key, { rate: e.target.value.replace(/[^\d.]/g, "") })} />
                    </label>
                    {servings.length > 1 && (
                      <label className="flex items-center gap-1 text-xs text-zinc-500">Serve at
                        <select className={SMALL} value={line.servingIndex ?? ""} onChange={(e) => patchLine(line.key, { servingIndex: e.target.value === "" ? undefined : Number(e.target.value) })}>
                          <option value="">Whole event</option>
                          {servings.map((s, i) => <option key={i} value={i}>{s.label} {formatTime(s.time)}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {activeCatalog.filter((i) => i.group === tab).length === 0 && (
            <p className="text-xs text-zinc-400">No {GROUP_LABEL[tab].toLowerCase()} items in your price list yet. Add one below.</p>
          )}
        </div>

        {/* one-off lines (not in the price list) */}
        {customLines.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">One-off items</div>
            {customLines.map((l) => (
              <div key={l.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-amber-400 bg-amber-50/60 dark:bg-amber-950/10 px-3 py-2">
                <span className="text-sm flex-1 min-w-[8rem]">{l.name} <span className="text-xs text-zinc-400">({GROUP_LABEL[l.group]})</span></span>
                <input className={cn(SMALL, "w-20")} inputMode="decimal" value={l.quantity} onChange={(e) => patchLine(l.key, { quantity: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Quantity" />
                <span className="text-xs text-zinc-500">{l.unit} × ₹</span>
                <input className={cn(SMALL, "w-24")} inputMode="decimal" value={l.rate} onChange={(e) => patchLine(l.key, { rate: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Rate" />
                <span className="text-sm font-medium w-24 text-right">{rs(num(l.quantity) * num(l.rate))}</span>
                <button type="button" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} aria-label="Remove" className="text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        )}

        {customOpen ? (
          <form onSubmit={addCustom} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2.5">
            <input className={INPUT} placeholder="Item name, e.g. Extra tent" value={custom.name} onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))} autoFocus required maxLength={80} />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select className={INPUT} value={custom.group} onChange={(e) => setCustom((c) => ({ ...c, group: e.target.value as ItemGroupKey }))}>
                {ITEM_GROUPS.map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}
              </select>
              <select className={INPUT} value={custom.unit} onChange={(e) => setCustom((c) => ({ ...c, unit: e.target.value }))}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <input className={INPUT} inputMode="decimal" placeholder="Rate ₹" value={custom.rate} onChange={(e) => setCustom((c) => ({ ...c, rate: e.target.value.replace(/[^\d.]/g, "") }))} />
              <input className={INPUT} inputMode="decimal" placeholder="Qty" value={custom.qty} onChange={(e) => setCustom((c) => ({ ...c, qty: e.target.value.replace(/[^\d.]/g, "") }))} />
            </div>
            <label className="flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
              <input type="checkbox" checked={custom.save} onChange={(e) => setCustom((c) => ({ ...c, save: e.target.checked }))} className="h-4 w-4 accent-amber-500" />
              Save to my price list for next time
            </label>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">Add to order</button>
              <button type="button" onClick={() => setCustomOpen(false)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-500">Cancel</button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => { setCustom((c) => ({ ...c, group: tab })); setCustomOpen(true); }} className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600 hover:underline">
            <Plus className="h-4 w-4" /> Add an item that isn&apos;t listed
          </button>
        )}
      </Card>

      {/* 4. team */}
      {!quote && <Card title="4 · Team for this function" hint="Optional. Pick who is working and what you pay each person for this function. Someone new can be added right here.">
        {team.length > 0 && (
          <div className="space-y-2">
            {team.map((t) => (
              <div key={t.employeeId} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2">
                <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{t.name}<span className="ml-2 text-xs font-normal text-zinc-400">{people.find((p) => p.id === t.employeeId)?.role}</span></span>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
                  <input className={cn(INPUT, "pl-6")} inputMode="decimal" placeholder="Pay" value={t.amount} onChange={(e) => setTeam((x) => x.map((y) => (y.employeeId === t.employeeId ? { ...y, amount: e.target.value.replace(/[^\d.]/g, "") } : y)))} aria-label={`Pay for ${t.name}`} />
                </div>
                <button type="button" onClick={() => setTeam((x) => x.filter((y) => y.employeeId !== t.employeeId))} aria-label={`Remove ${t.name}`} className="p-1.5 text-zinc-400 hover:text-red-500"><X className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="text-xs text-zinc-500">{team.length} {team.length === 1 ? "person" : "people"}{teamCost > 0 && <> · team pay <span className="font-semibold text-zinc-800 dark:text-zinc-200">{rs(teamCost)}</span></>}</div>
          </div>
        )}
        <div className="flex gap-2">
          <select className={INPUT} value={pickPerson} onChange={(e) => addToTeam(e.target.value)}>
            <option value="">Choose from the staff list…</option>
            {people.filter((p) => !team.some((t) => t.employeeId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.role}</option>)}
          </select>
          <button type="button" onClick={() => setAddingPerson((v) => !v)} className="shrink-0 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 text-xs font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20">+ New person</button>
        </div>
        {addingPerson && (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 space-y-2">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <input className={INPUT} placeholder="Name" value={newPerson.name} onChange={(e) => setNewPerson((p) => ({ ...p, name: e.target.value }))} autoFocus />
              <input className={INPUT} inputMode="tel" placeholder="Phone (optional)" value={newPerson.phone} onChange={(e) => setNewPerson((p) => ({ ...p, phone: e.target.value }))} />
              <div className="relative col-span-2 sm:col-span-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
                <input className={cn(INPUT, "pl-6")} inputMode="decimal" placeholder="Daily wage" value={newPerson.wage} onChange={(e) => setNewPerson((p) => ({ ...p, wage: e.target.value.replace(/[^\d.]/g, "") }))} />
              </div>
            </div>
            <p className="text-[11px] text-zinc-400">Added as a daily-wage person: paid for the days they work. You can change this later under Parties → Staff.</p>
            {personError && <p className="text-xs text-red-500">{personError}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={createPerson} className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold">Add and put on this function</button>
              <button type="button" onClick={() => setAddingPerson(false)} className="px-3 py-1.5 rounded-lg text-sm text-zinc-500">Cancel</button>
            </div>
          </div>
        )}
      </Card>}

      {/* 5. bills */}
      <Card title={quote ? "4 · Prices" : "5 · Bills"} hint="Food goes on the food bill. Equipment, staff and decoration go on the service & settings bill. Each has its own invoice, discount and payments.">
        <div className="grid gap-4 md:grid-cols-2">
          {(["FOOD", "SERVICE"] as const).map((t) => {
            const m = t === "FOOD" ? food : service;
            const rows = lines.filter((l) => billTypeOfGroup(l.group) === t);
            return (
              <div key={t} className={cn("rounded-xl border p-4 space-y-3", m.count ? "border-zinc-200 dark:border-zinc-700" : "border-dashed border-zinc-200 dark:border-zinc-800 opacity-60")}>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">{BILL_LABEL[t]}</h3>
                  <span className="text-xs text-zinc-400">{m.count} item{m.count === 1 ? "" : "s"}</span>
                </div>
                {rows.length > 0 ? (
                  <div className="space-y-1 text-sm">
                    {rows.map((l) => (
                      <div key={l.key} className="flex justify-between gap-3">
                        <span className="text-zinc-600 dark:text-zinc-400 truncate">{l.name} <span className="text-xs text-zinc-400">{num(l.quantity)} × {rs(num(l.rate))}</span></span>
                        <span className="shrink-0">{rs(num(l.quantity) * num(l.rate))}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-400">No {t === "FOOD" ? "food" : "service or setting"} items ticked, so there is no {t === "FOOD" ? "food" : "service"} bill.</p>
                )}
                {m.count > 0 && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Discount (₹)"><input className={INPUT} inputMode="decimal" value={adj[t].discount} onChange={(e) => patchAdj(t, { discount: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" /></Field>
                      <Field label="Reason"><input className={INPUT} value={adj[t].reason} onChange={(e) => patchAdj(t, { reason: e.target.value })} placeholder="optional" /></Field>
                      {showAdvance && (
                        <Field label="Advance received (₹)"><input className={INPUT} inputMode="decimal" value={adj[t].advance} onChange={(e) => patchAdj(t, { advance: e.target.value.replace(/[^\d.]/g, "") })} placeholder="0" /></Field>
                      )}
                    </div>
                    <div className="border-t border-zinc-200 dark:border-zinc-700 pt-2 text-sm space-y-0.5">
                      {m.discount > 0 && <div className="flex justify-between text-amber-600 dark:text-amber-400"><span>Discount</span><span>−{rs(m.discount)}</span></div>}
                      {m.gst && !m.gstInclusive && <div className="flex justify-between text-zinc-500"><span>GST {m.gstRateBp / 100}%</span><span>+{rs(m.gst.gstPaise / 100)}</span></div>}
                      <div className="flex justify-between font-semibold"><span>Total</span><span>{rs(m.net)}</span></div>
                      {m.gst && m.gstInclusive && <div className="text-[11px] text-zinc-400">Includes GST {m.gstRateBp / 100}% ({rs(m.gst.gstPaise / 100)})</div>}
                      {showAdvance && m.advance > 0 && <div className="flex justify-between text-xs text-red-500"><span>Balance after advance</span><span>{rs(m.balance)}</span></div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {showAdvance && grandAdvance > 0 && (
          <Field label="Advance paid by">
            <select className={cn(INPUT, "max-w-xs")} value={advanceMethod} onChange={(e) => setAdvanceMethod(e.target.value)}>
              <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK">Bank transfer</option>
            </select>
          </Field>
        )}
        <Field label="Notes for the kitchen / team"><textarea className={cn(INPUT, "resize-none")} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Less spicy, set up by 6 AM" /></Field>
      </Card>

      {/* sticky total */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 md:left-52 z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[10rem]">
            <div className="text-xs text-zinc-500">
              {food.count > 0 && <>Food {rs(food.net)}</>}{food.count > 0 && service.count > 0 && " · "}{service.count > 0 && <>Service {rs(service.net)}</>}{lines.length === 0 && "No items yet"}
            </div>
            <div className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{rs(grandNet)}{showAdvance && grandAdvance > 0 && <span className="ml-2 text-xs font-medium text-red-500">Balance {rs(Math.max(0, grandNet - grandAdvance))}</span>}</div>
          </div>
          {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
          <button type="button" onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {quote ? (quote.id ? "Save quotation" : "Create quotation") : initial ? "Save changes" : "Save order"}
          </button>
        </div>
      </div>
    </div>
  );
}
