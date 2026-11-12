"use client";

import { useState } from "react";
import { Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

type AddonRow = { id?: string; name: string; price: string; unit: "FIXED" | "HOUR"; active: boolean };
export type AddonInitial = { id: string; name: string; pricePaise: number; unit: "FIXED" | "HOUR"; active: boolean };

const SUGGESTIONS = ["Air conditioning", "Cleaning & maintenance", "Security", "Generator backup", "Sound & lights"];

const FIELD =
  "w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/60 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-400";

export function VenueAddonsManager({ venueId, initial }: { venueId: string; initial: AddonInitial[] }) {
  const [rows, setRows] = useState<AddonRow[]>(
    initial.map((a) => ({ id: a.id, name: a.name, price: String(a.pricePaise / 100), unit: a.unit ?? "FIXED", active: a.active }))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);

  const update = (i: number, patch: Partial<AddonRow>) => {
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
    setDirty(true);
    setSaved(false);
  };
  const add = (name = "") => {
    setRows((r) => [...r, { name, price: "", unit: /air|ac\b|cooling|generator|sound|light/i.test(name) ? "HOUR" : "FIXED", active: true }]);
    setDirty(true);
    setSaved(false);
  };
  const remove = (i: number) => {
    setRows((r) => r.filter((_, j) => j !== i));
    setDirty(true);
    setSaved(false);
  };

  async function save() {
    setError("");
    const addons = [];
    for (const r of rows) {
      const price = Number(r.price);
      if (!r.name.trim()) { setError("Every add-on needs a name"); return; }
      if (r.price.trim() === "" || !Number.isInteger(price) || price < 0) { setError(`Enter a whole-rupee price for "${r.name}"`); return; }
      addons.push({ id: r.id, name: r.name.trim(), priceRupees: price, unit: r.unit, active: r.active });
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/owner/venues/${venueId}/addons`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addons }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Could not save"); return; }
      setRows((data.addons as AddonInitial[]).map((a) => ({ id: a.id, name: a.name, price: String(a.pricePaise / 100), unit: a.unit, active: a.active })));
      setDirty(false);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const unused = SUGGESTIONS.filter((s) => !rows.some((r) => r.name.toLowerCase() === s.toLowerCase()));

  return (
    <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
      <div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Add-on services</span>
        <p className="text-xs text-zinc-500 mt-0.5">
          Optional extras you charge on top of the hall, such as AC, cleaning or security. Price them per booking or per hour; you choose them (and the hours) on each booking, and they appear as separate lines on the invoice.
        </p>
      </div>

      {rows.length === 0 && <p className="text-xs text-zinc-500 dark:text-zinc-400">No add-ons yet.</p>}

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="grid grid-cols-[1fr_6rem_7.5rem_auto_auto] items-center gap-2">
            <input className={FIELD} value={r.name} placeholder="e.g. Air conditioning" maxLength={60} onChange={(e) => update(i, { name: e.target.value })} />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 dark:text-zinc-400">₹</span>
              <input className={cn(FIELD, "pl-6")} value={r.price} inputMode="numeric" placeholder="0" onChange={(e) => update(i, { price: e.target.value.replace(/\D/g, "") })} />
            </div>
            <select className={FIELD} value={r.unit} onChange={(e) => update(i, { unit: e.target.value as "FIXED" | "HOUR" })} aria-label="Pricing">
              <option value="FIXED">per booking</option>
              <option value="HOUR">per hour</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer whitespace-nowrap">
              <input type="checkbox" checked={r.active} onChange={(e) => update(i, { active: e.target.checked })} className="h-4 w-4 accent-amber-500" />
              Offer
            </label>
            <button type="button" onClick={() => remove(i)} aria-label="Remove add-on" className="p-1.5 text-zinc-500 dark:text-zinc-400 hover:text-red-500">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {unused.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => add(s)}
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-amber-400 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
          >
            <Sparkles className="h-3 w-3" /> {s}
          </button>
        ))}
        <button type="button" onClick={() => add()} className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 dark:text-amber-500 hover:underline">
          <Plus className="h-3.5 w-3.5" /> Custom add-on
        </button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      {(dirty || saved) && (
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-900 font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save add-ons"}
        </button>
      )}
    </div>
  );
}
