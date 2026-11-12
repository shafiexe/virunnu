"use client";

import { useState } from "react";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { GROUP_LABEL, ITEM_GROUPS, UNITS, type ItemGroupKey } from "@/lib/caterer-items";
import { cn } from "@/lib/utils";

export type PriceItem = { id: string; name: string; group: ItemGroupKey; unit: string; ratePaise: number; active: boolean; showOnPublic?: boolean; category?: string | null; description?: string | null; isVeg?: boolean; isSpecial?: boolean };

const MENU_SECTIONS = ["Packages", "Starters", "Main course", "Biriyani & rice", "Breads", "Seafood", "Desserts", "Drinks", "Live counters"];

const FIELD =
  "rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-2.5 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

const rupees = (paise: number) => String(paise / 100);

function ItemRow({ item, onChange, onDelete }: { item: PriceItem; onChange: (i: PriceItem) => void; onDelete: (id: string) => void }) {
  const [name, setName] = useState(item.name);
  const [rate, setRate] = useState(rupees(item.ratePaise));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(patch: Record<string, unknown>) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/caterer/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); setName(item.name); setRate(rupees(item.ratePaise)); return; }
      onChange(data.item);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1">
      <div className={cn("grid grid-cols-[1fr_5.5rem_6rem_auto_auto] items-center gap-2", !item.active && "opacity-50")}>
        <input
          className={FIELD} value={name} maxLength={80}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== item.name && save({ name: name.trim() })}
        />
        <select className={FIELD} value={item.unit} onChange={(e) => save({ unit: e.target.value })} aria-label="Unit">
          {[...new Set([...UNITS, item.unit])].map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
          <input
            className={cn(FIELD, "w-full pl-6")} inputMode="decimal" value={rate}
            onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))}
            onBlur={() => { const n = Number(rate); if (rate !== "" && !Number.isNaN(n) && Math.round(n * 100) !== item.ratePaise) save({ rate: n }); }}
          />
        </div>
        <label className="flex items-center gap-1 text-xs text-zinc-500 cursor-pointer whitespace-nowrap" title="Untick to hide from new orders">
          <input type="checkbox" checked={item.active} onChange={(e) => save({ active: e.target.checked })} className="h-4 w-4 accent-amber-500" />
          Use
        </label>
        <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`} className="p-1.5 text-zinc-400 hover:text-red-500">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </button>
      </div>
      {item.group === "FOOD" && (
        <div className="pl-1">
          <label className="inline-flex items-center gap-2 text-xs text-zinc-500 cursor-pointer">
            <input type="checkbox" className="h-4 w-4 accent-amber-500" checked={!!item.showOnPublic} onChange={(e) => save({ showOnPublic: e.target.checked, ...(e.target.checked && !item.category ? { category: "Main course" } : {}) })} />
            Show on my public page
          </label>
          {item.showOnPublic && (
            <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr_auto_auto] items-center rounded-xl bg-zinc-50 dark:bg-zinc-800/40 p-2.5">
              <input className={FIELD} list="menu-sections" placeholder="Section" defaultValue={item.category ?? ""} maxLength={50} onBlur={(e) => e.target.value.trim() !== (item.category ?? "") && save({ category: e.target.value.trim() })} />
              <input className={FIELD} placeholder="Short description (optional)" defaultValue={item.description ?? ""} maxLength={300} onBlur={(e) => e.target.value.trim() !== (item.description ?? "") && save({ description: e.target.value.trim() })} />
              <button type="button" onClick={() => save({ isVeg: !(item.isVeg ?? true) })} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold", (item.isVeg ?? true) ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20" : "border-red-300 text-red-700 bg-red-50 dark:bg-red-950/20")}>{(item.isVeg ?? true) ? "Veg" : "Non-veg"}</button>
              <button type="button" onClick={() => save({ isSpecial: !item.isSpecial })} className={cn("rounded-lg border px-2.5 py-1.5 text-xs font-semibold", item.isSpecial ? "border-amber-400 bg-amber-100 text-amber-800 dark:bg-amber-950/30" : "border-zinc-200 dark:border-zinc-700 text-zinc-500")}>⭐ Special</button>
              <datalist id="menu-sections">{MENU_SECTIONS.map((s) => <option key={s} value={s} />)}</datalist>
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

function AddRow({ group, onAdded }: { group: ItemGroupKey; onAdded: (i: PriceItem) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("nos");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/caterer/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, group, unit, rate: Number(rate) || 0 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not add"); return; }
      onAdded(data.item);
      setName(""); setRate(""); setUnit("nos"); setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline">
        <Plus className="h-3.5 w-3.5" /> Add {GROUP_LABEL[group].toLowerCase()} item
      </button>
    );
  }
  return (
    <form onSubmit={add} className="space-y-1">
      <div className="grid grid-cols-[1fr_5.5rem_6rem_auto] items-center gap-2">
        <input className={FIELD} placeholder="Item name" value={name} onChange={(e) => setName(e.target.value)} autoFocus maxLength={80} required />
        <select className={FIELD} value={unit} onChange={(e) => setUnit(e.target.value)}>
          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-zinc-400">₹</span>
          <input className={cn(FIELD, "w-full pl-6")} inputMode="decimal" placeholder="Rate" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ""))} />
        </div>
        <div className="flex gap-1.5">
          <button type="submit" disabled={saving} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50">{saving ? "…" : "Add"}</button>
          <button type="button" onClick={() => setOpen(false)} className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-500">Cancel</button>
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </form>
  );
}

export function CatererItemsManager({ initial }: { initial: PriceItem[] }) {
  const [items, setItems] = useState(initial);
  const [seeding, setSeeding] = useState(false);
  const [notice, setNotice] = useState("");

  async function addStarter() {
    setSeeding(true);
    setNotice("");
    try {
      const res = await fetch("/api/caterer/items/starter", { method: "POST" });
      if (res.ok) {
        const list = await fetch("/api/caterer/items").then((r) => r.json());
        setItems(list.items);
        const { added } = await res.json();
        setNotice(added > 0 ? `Added ${added} items. Please check the units and rates.` : "You already have all the starter items.");
      }
    } finally {
      setSeeding(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/caterer/items/${id}`, { method: "DELETE" });
    if (res.ok) setItems((list) => list.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-5">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/10 p-6 text-center space-y-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">Your price list is empty. Start with the usual items from your bills (food, plates, serving boys, counters) and change the rates to yours.</p>
          <button type="button" onClick={addStarter} disabled={seeding} className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Add common items
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-zinc-500">Tick items on an order and the rate you set here fills in. You can still change the rate on each order.</p>
          <button type="button" onClick={addStarter} disabled={seeding} className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline disabled:opacity-50">
            {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />} Add common items
          </button>
        </div>
      )}
      {notice && <p className="text-sm text-emerald-600 dark:text-emerald-400">{notice}</p>}

      {ITEM_GROUPS.map((group) => {
        const rows = items.filter((i) => i.group === group);
        return (
          <section key={group} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
              {GROUP_LABEL[group]} <span className="text-zinc-300">· {rows.length}</span>
            </h2>
            {rows.map((i) => (
              <ItemRow key={i.id} item={i} onChange={(u) => setItems((list) => list.map((x) => (x.id === u.id ? u : x)))} onDelete={remove} />
            ))}
            <AddRow group={group} onAdded={(i) => setItems((list) => [...list, i])} />
          </section>
        );
      })}
    </div>
  );
}
